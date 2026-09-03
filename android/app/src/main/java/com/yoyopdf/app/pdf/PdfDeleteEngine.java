package com.yoyopdf.app.pdf;

import android.content.ContentResolver;
import android.content.Context;
import android.net.Uri;
import com.tom_roush.pdfbox.io.MemoryUsageSetting;
import com.tom_roush.pdfbox.pdmodel.PDDocument;
import com.tom_roush.pdfbox.pdmodel.encryption.InvalidPasswordException;
import java.io.BufferedInputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.concurrent.atomic.AtomicBoolean;

public final class PdfDeleteEngine {
    public interface ProgressCallback {
        void onPageCopied(int completed, int total);
    }

    public int deletePages(
        Context context,
        Uri sourceUri,
        List<Integer> pagesToDelete,
        File destination,
        AtomicBoolean cancelRequested,
        ProgressCallback progressCallback
    ) throws PdfDeleteException {
        if (sourceUri == null) throw new PdfDeleteException("INVALID_URI", "The PDF reference is missing.");
        if (pagesToDelete == null || pagesToDelete.isEmpty()) throw new PdfDeleteException("NO_PAGES_SELECTED", "Select pages to delete.");
        File parent = destination.getParentFile();
        if (parent != null && !parent.exists() && !parent.mkdirs()) {
            throw new PdfDeleteException("OUTPUT_CREATION_FAILED", "The output directory could not be created.");
        }

        ContentResolver resolver = context.getContentResolver();
        try (
            InputStream rawInput = resolver.openInputStream(sourceUri);
            BufferedInputStream input = rawInput == null ? null : new BufferedInputStream(rawInput)
        ) {
            if (input == null) throw new PdfDeleteException("INACCESSIBLE_FILE", "The selected PDF can no longer be opened.");
            validatePdfHeader(input);
            try (PDDocument source = PDDocument.load(input, MemoryUsageSetting.setupTempFileOnly())) {
                int sourceCount = source.getNumberOfPages();
                Set<Integer> deleted = validateDeletedPages(pagesToDelete, sourceCount);
                int remaining = sourceCount - deleted.size();
                try (
                    PDDocument output = new PDDocument(MemoryUsageSetting.setupTempFileOnly());
                    FileOutputStream outputStream = new FileOutputStream(destination)
                ) {
                    int completed = 0;
                    for (int page = 1; page <= sourceCount; page += 1) {
                        if (deleted.contains(page)) continue;
                        ensureNotCancelled(cancelRequested);
                        output.importPage(source.getPage(page - 1));
                        completed += 1;
                        if (progressCallback != null) progressCallback.onPageCopied(completed, remaining);
                    }
                    ensureNotCancelled(cancelRequested);
                    output.save(outputStream);
                    outputStream.flush();
                    return remaining;
                }
            }
        } catch (InvalidPasswordException error) {
            throw new PdfDeleteException("ENCRYPTED_PDF", "The selected PDF is password-protected.", error);
        } catch (SecurityException error) {
            throw new PdfDeleteException("INACCESSIBLE_FILE", "Permission to read the selected PDF was denied.", error);
        } catch (PdfDeleteException error) {
            throw error;
        } catch (IOException error) {
            if (isOutOfSpace(error)) {
                throw new PdfDeleteException("INSUFFICIENT_STORAGE", "There is not enough free storage to create this PDF.", error);
            }
            throw new PdfDeleteException("DELETE_FAILED", "Pages could not be removed from the PDF.", error);
        }
    }

    static Set<Integer> validateDeletedPages(List<Integer> pages, int pageCount) throws PdfDeleteException {
        if (pageCount < 1) throw new PdfDeleteException("INVALID_PDF", "The selected PDF contains no pages.");
        Set<Integer> unique = new HashSet<>();
        for (Integer page : pages) {
            if (page == null || page < 1 || page > pageCount) {
                throw new PdfDeleteException("INVALID_PAGE_INDEX", "A selected page is outside the source PDF.");
            }
            if (!unique.add(page)) throw new PdfDeleteException("INVALID_PAGE_INDEX", "A selected page is duplicated.");
        }
        if (unique.size() == pageCount) throw new PdfDeleteException("DELETE_ALL_PAGES", "At least one page must remain.");
        return unique;
    }

    private static void validatePdfHeader(BufferedInputStream input) throws IOException, PdfDeleteException {
        input.mark(8);
        byte[] header = new byte[5];
        int count = input.read(header);
        input.reset();
        if (count != 5 || header[0] != '%' || header[1] != 'P' || header[2] != 'D' || header[3] != 'F' || header[4] != '-') {
            throw new PdfDeleteException("INVALID_PDF", "The selected file is not a valid PDF.");
        }
    }

    private static void ensureNotCancelled(AtomicBoolean cancelRequested) throws PdfDeleteException {
        if (cancelRequested != null && cancelRequested.get()) throw new PdfDeleteException("CANCELLED", "Page deletion was cancelled.");
    }

    private static boolean isOutOfSpace(Throwable error) {
        Throwable cursor = error;
        while (cursor != null) {
            String message = cursor.getMessage();
            if (message != null) {
                String normalized = message.toLowerCase(Locale.US);
                if (normalized.contains("no space left") || normalized.contains("enospc") || normalized.contains("disk full")) return true;
            }
            cursor = cursor.getCause();
        }
        return false;
    }
}
