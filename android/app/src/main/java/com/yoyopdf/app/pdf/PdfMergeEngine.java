package com.yoyopdf.app.pdf;

import android.content.ContentResolver;
import android.content.Context;
import android.net.Uri;
import com.tom_roush.pdfbox.io.MemoryUsageSetting;
import com.tom_roush.pdfbox.multipdf.PDFMergerUtility;
import com.tom_roush.pdfbox.pdmodel.PDDocument;
import com.tom_roush.pdfbox.pdmodel.encryption.InvalidPasswordException;
import java.io.BufferedInputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.List;
import java.util.Locale;
import java.util.concurrent.atomic.AtomicBoolean;

public final class PdfMergeEngine {
    public interface ProgressCallback {
        void onFileMerged(int completed, int total);
    }

    public int merge(
        Context context,
        List<Uri> sources,
        File destination,
        AtomicBoolean cancelRequested,
        ProgressCallback progressCallback
    ) throws PdfMergeException {
        if (sources == null || sources.size() < 2) {
            throw new PdfMergeException("TOO_FEW_FILES", "Choose at least two PDF files.");
        }

        ContentResolver resolver = context.getContentResolver();
        PDFMergerUtility merger = new PDFMergerUtility();
        int totalPages = 0;

        try (
            PDDocument output = new PDDocument(MemoryUsageSetting.setupTempFileOnly());
            FileOutputStream outputStream = new FileOutputStream(destination)
        ) {
            for (int index = 0; index < sources.size(); index += 1) {
                ensureNotCancelled(cancelRequested);
                Uri sourceUri = sources.get(index);

                try (
                    InputStream rawInput = resolver.openInputStream(sourceUri);
                    BufferedInputStream input = rawInput == null ? null : new BufferedInputStream(rawInput)
                ) {
                    if (input == null) {
                        throw new PdfMergeException("INACCESSIBLE_FILE", "A selected PDF can no longer be opened.");
                    }
                    validatePdfHeader(input);
                    try (PDDocument source = PDDocument.load(input, MemoryUsageSetting.setupTempFileOnly())) {
                        if (source.getNumberOfPages() < 1) {
                            throw new PdfMergeException("INVALID_PDF", "A selected PDF contains no pages.");
                        }
                        merger.appendDocument(output, source);
                        totalPages += source.getNumberOfPages();
                    }
                } catch (InvalidPasswordException error) {
                    throw new PdfMergeException("ENCRYPTED_PDF", "A selected PDF is password-protected.", error);
                } catch (SecurityException error) {
                    throw new PdfMergeException("INACCESSIBLE_FILE", "Permission to read a selected PDF was denied.", error);
                } catch (PdfMergeException error) {
                    throw error;
                } catch (IOException error) {
                    throw classifyReadFailure(error);
                }

                if (progressCallback != null) {
                    progressCallback.onFileMerged(index + 1, sources.size());
                }
            }

            ensureNotCancelled(cancelRequested);
            output.save(outputStream);
            outputStream.getFD().sync();
            return totalPages;
        } catch (PdfMergeException error) {
            throw error;
        } catch (IOException error) {
            if (isOutOfSpace(error)) {
                throw new PdfMergeException("INSUFFICIENT_STORAGE", "There is not enough free storage to save the merged PDF.", error);
            }
            throw new PdfMergeException("MERGE_FAILED", "The PDFs could not be merged.", error);
        }
    }

    private static void validatePdfHeader(BufferedInputStream input) throws IOException, PdfMergeException {
        input.mark(8);
        byte[] header = new byte[5];
        int count = input.read(header);
        input.reset();
        if (count != 5 || header[0] != '%' || header[1] != 'P' || header[2] != 'D' || header[3] != 'F' || header[4] != '-') {
            throw new PdfMergeException("INVALID_PDF", "A selected file is not a valid PDF.");
        }
    }

    private static void ensureNotCancelled(AtomicBoolean cancelRequested) throws PdfMergeException {
        if (cancelRequested != null && cancelRequested.get()) {
            throw new PdfMergeException("CANCELLED", "The merge was cancelled.");
        }
    }

    private static PdfMergeException classifyReadFailure(IOException error) {
        if (isOutOfSpace(error)) {
            return new PdfMergeException("INSUFFICIENT_STORAGE", "There is not enough free storage to process these PDFs.", error);
        }
        String message = messageChain(error).toLowerCase(Locale.US);
        if (message.contains("unsupported") || message.contains("not implemented")) {
            return new PdfMergeException("UNSUPPORTED_PDF", "A selected PDF uses a feature this version cannot process.", error);
        }
        return new PdfMergeException("CORRUPTED_PDF", "A selected PDF is damaged or incomplete.", error);
    }

    private static boolean isOutOfSpace(Throwable error) {
        String message = messageChain(error).toLowerCase(Locale.US);
        return message.contains("no space left") || message.contains("enospc") || message.contains("disk full");
    }

    private static String messageChain(Throwable error) {
        StringBuilder result = new StringBuilder();
        Throwable cursor = error;
        while (cursor != null) {
            if (cursor.getMessage() != null) {
                result.append(' ').append(cursor.getMessage());
            }
            cursor = cursor.getCause();
        }
        return result.toString();
    }
}
