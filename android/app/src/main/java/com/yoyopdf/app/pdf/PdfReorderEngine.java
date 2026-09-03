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

public final class PdfReorderEngine {
    public interface ProgressCallback {
        void onPageCopied(int completed, int total);
    }

    public int reorder(
        Context context,
        Uri sourceUri,
        List<Integer> order,
        File destination,
        AtomicBoolean cancelRequested,
        ProgressCallback progressCallback
    ) throws PdfReorderException {
        if (sourceUri == null) throw new PdfReorderException("INVALID_URI", "The PDF reference is missing.");
        if (order == null || order.isEmpty()) throw new PdfReorderException("EMPTY_PAGE_ORDER", "At least one page must remain.");
        File parent = destination.getParentFile();
        if (parent != null && !parent.exists() && !parent.mkdirs()) {
            throw new PdfReorderException("OUTPUT_CREATION_FAILED", "The reordered PDF directory could not be created.");
        }

        ContentResolver resolver = context.getContentResolver();
        try (
            InputStream rawInput = resolver.openInputStream(sourceUri);
            BufferedInputStream input = rawInput == null ? null : new BufferedInputStream(rawInput)
        ) {
            if (input == null) throw new PdfReorderException("INACCESSIBLE_FILE", "The selected PDF can no longer be opened.");
            validatePdfHeader(input);
            try (
                PDDocument source = PDDocument.load(input, MemoryUsageSetting.setupTempFileOnly());
                PDDocument output = new PDDocument(MemoryUsageSetting.setupTempFileOnly());
                FileOutputStream outputStream = new FileOutputStream(destination)
            ) {
                int pageCount = source.getNumberOfPages();
                validateOrder(order, pageCount);
                for (int index = 0; index < order.size(); index += 1) {
                    ensureNotCancelled(cancelRequested);
                    output.importPage(source.getPage(order.get(index) - 1));
                    if (progressCallback != null) progressCallback.onPageCopied(index + 1, pageCount);
                }
                ensureNotCancelled(cancelRequested);
                output.save(outputStream);
                outputStream.flush();
                return pageCount;
            }
        } catch (InvalidPasswordException error) {
            throw new PdfReorderException("ENCRYPTED_PDF", "The selected PDF is password-protected.", error);
        } catch (SecurityException error) {
            throw new PdfReorderException("INACCESSIBLE_FILE", "Permission to read the selected PDF was denied.", error);
        } catch (PdfReorderException error) {
            throw error;
        } catch (IOException error) {
            if (isOutOfSpace(error)) {
                throw new PdfReorderException("INSUFFICIENT_STORAGE", "There is not enough free storage to reorder this PDF.", error);
            }
            throw new PdfReorderException("REORDER_FAILED", "The PDF could not be reordered.", error);
        }
    }

    static void validateOrder(List<Integer> order, int pageCount) throws PdfReorderException {
        if (pageCount < 1) throw new PdfReorderException("INVALID_PDF", "The selected PDF contains no pages.");
        if (order.size() != pageCount) throw new PdfReorderException("INVALID_PAGE_ORDER", "The page order must preserve every source page.");
        Set<Integer> seen = new HashSet<>();
        for (Integer page : order) {
            if (page == null || page < 1 || page > pageCount) {
                throw new PdfReorderException("INVALID_PAGE_ORDER", "A page number is outside the source PDF.");
            }
            if (!seen.add(page)) throw new PdfReorderException("INVALID_PAGE_ORDER", "A page number is duplicated.");
        }
    }

    private static void validatePdfHeader(BufferedInputStream input) throws IOException, PdfReorderException {
        input.mark(8);
        byte[] header = new byte[5];
        int count = input.read(header);
        input.reset();
        if (count != 5 || header[0] != '%' || header[1] != 'P' || header[2] != 'D' || header[3] != 'F' || header[4] != '-') {
            throw new PdfReorderException("INVALID_PDF", "The selected file is not a valid PDF.");
        }
    }

    private static void ensureNotCancelled(AtomicBoolean cancelRequested) throws PdfReorderException {
        if (cancelRequested != null && cancelRequested.get()) throw new PdfReorderException("CANCELLED", "The reorder was cancelled.");
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
