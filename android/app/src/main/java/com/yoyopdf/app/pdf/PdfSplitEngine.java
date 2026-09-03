package com.yoyopdf.app.pdf;

import android.content.ContentResolver;
import android.content.Context;
import android.net.Uri;
import com.tom_roush.pdfbox.io.MemoryUsageSetting;
import com.tom_roush.pdfbox.pdmodel.PDDocument;
import com.tom_roush.pdfbox.pdmodel.encryption.InvalidPasswordException;
import java.io.BufferedInputStream;
import java.io.BufferedOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

public final class PdfSplitEngine {
    public interface ProgressCallback {
        void onOutputCreated(int completed, int total);
    }

    public static final class Result {
        private final File file;
        private final String name;
        private final String mimeType;
        private final int outputCount;
        private final int pageCount;

        Result(File file, String name, String mimeType, int outputCount, int pageCount) {
            this.file = file;
            this.name = name;
            this.mimeType = mimeType;
            this.outputCount = outputCount;
            this.pageCount = pageCount;
        }

        public File getFile() { return file; }
        public String getName() { return name; }
        public String getMimeType() { return mimeType; }
        public int getOutputCount() { return outputCount; }
        public int getPageCount() { return pageCount; }
    }

    public Result split(
        Context context,
        Uri sourceUri,
        List<List<Integer>> groups,
        File workingDirectory,
        String sourceName,
        AtomicBoolean cancelRequested,
        ProgressCallback progressCallback
    ) throws PdfSplitException {
        if (sourceUri == null) throw new PdfSplitException("INVALID_URI", "The PDF reference is missing.");
        if (groups == null || groups.isEmpty()) throw new PdfSplitException("NO_PAGES_SELECTED", "Choose pages to split.");
        if (!workingDirectory.exists() && !workingDirectory.mkdirs()) {
            throw new PdfSplitException("OUTPUT_CREATION_FAILED", "The split output directory could not be created.");
        }

        ContentResolver resolver = context.getContentResolver();
        String stem = safeStem(sourceName);
        List<File> outputs = new ArrayList<>();
        int totalOutputPages = 0;

        try (
            InputStream rawInput = resolver.openInputStream(sourceUri);
            BufferedInputStream input = rawInput == null ? null : new BufferedInputStream(rawInput)
        ) {
            if (input == null) throw new PdfSplitException("INACCESSIBLE_FILE", "The selected PDF can no longer be opened.");
            validatePdfHeader(input);
            try (PDDocument source = PDDocument.load(input, MemoryUsageSetting.setupTempFileOnly())) {
                int sourcePageCount = source.getNumberOfPages();
                if (sourcePageCount < 1) throw new PdfSplitException("INVALID_PDF", "The selected PDF contains no pages.");
                validateGroups(groups, sourcePageCount);

                for (int index = 0; index < groups.size(); index += 1) {
                    ensureNotCancelled(cancelRequested);
                    List<Integer> pages = groups.get(index);
                    String outputName = outputName(stem, pages);
                    File outputFile = new File(workingDirectory, outputName);
                    try (
                        PDDocument output = new PDDocument(MemoryUsageSetting.setupTempFileOnly());
                        FileOutputStream outputStream = new FileOutputStream(outputFile)
                    ) {
                        for (Integer page : pages) {
                            ensureNotCancelled(cancelRequested);
                            output.importPage(source.getPage(page - 1));
                        }
                        output.save(outputStream);
                        outputStream.flush();
                    }
                    outputs.add(outputFile);
                    totalOutputPages += pages.size();
                    if (progressCallback != null) progressCallback.onOutputCreated(index + 1, groups.size());
                }
            }

            ensureNotCancelled(cancelRequested);
            if (outputs.size() == 1) {
                File output = outputs.get(0);
                return new Result(output, output.getName(), "application/pdf", 1, totalOutputPages);
            }
            String zipName = boundedName(stem + "_split_parts.zip", ".zip");
            File zipFile = new File(workingDirectory, zipName);
            writeZip(outputs, zipFile, cancelRequested);
            for (File output : outputs) deleteQuietly(output);
            return new Result(zipFile, zipName, "application/zip", outputs.size(), totalOutputPages);
        } catch (InvalidPasswordException error) {
            throw new PdfSplitException("ENCRYPTED_PDF", "The selected PDF is password-protected.", error);
        } catch (SecurityException error) {
            throw new PdfSplitException("INACCESSIBLE_FILE", "Permission to read the selected PDF was denied.", error);
        } catch (PdfSplitException error) {
            throw error;
        } catch (IOException error) {
            if (isOutOfSpace(error)) {
                throw new PdfSplitException("INSUFFICIENT_STORAGE", "There is not enough free storage to split this PDF.", error);
            }
            throw new PdfSplitException("SPLIT_FAILED", "The PDF could not be split.", error);
        }
    }

    private static void validateGroups(List<List<Integer>> groups, int pageCount) throws PdfSplitException {
        for (List<Integer> group : groups) {
            if (group == null || group.isEmpty()) throw new PdfSplitException("NO_PAGES_SELECTED", "An output contains no pages.");
            Set<Integer> seen = new HashSet<>();
            for (Integer page : group) {
                if (page == null || page < 1 || page > pageCount) {
                    throw new PdfSplitException("RANGE_OUT_OF_BOUNDS", "A requested page is outside the PDF.");
                }
                if (!seen.add(page)) throw new PdfSplitException("OVERLAPPING_RANGES", "An output repeats a page.");
            }
        }
    }

    private static void writeZip(List<File> files, File destination, AtomicBoolean cancelRequested) throws IOException, PdfSplitException {
        byte[] buffer = new byte[64 * 1024];
        try (ZipOutputStream zip = new ZipOutputStream(new BufferedOutputStream(new FileOutputStream(destination)))) {
            for (File file : files) {
                ensureNotCancelled(cancelRequested);
                zip.putNextEntry(new ZipEntry(file.getName()));
                try (InputStream input = new FileInputStream(file)) {
                    int read;
                    while ((read = input.read(buffer)) != -1) zip.write(buffer, 0, read);
                }
                zip.closeEntry();
            }
            zip.finish();
        }
    }

    private static String outputName(String stem, List<Integer> pages) {
        boolean contiguous = true;
        for (int index = 1; index < pages.size(); index += 1) {
            if (pages.get(index) != pages.get(index - 1) + 1) contiguous = false;
        }
        String suffix;
        if (pages.size() == 1) suffix = "page_" + pages.get(0);
        else if (contiguous) suffix = "split_" + pages.get(0) + "-" + pages.get(pages.size() - 1);
        else suffix = "pages_" + joinPages(pages);
        return boundedName(stem + "_" + suffix + ".pdf", ".pdf");
    }

    private static String joinPages(List<Integer> pages) {
        StringBuilder value = new StringBuilder();
        for (Integer page : pages) {
            if (value.length() > 0) value.append('-');
            value.append(page);
            if (value.length() > 40) {
                value.append("-more");
                break;
            }
        }
        return value.toString();
    }

    private static String safeStem(String value) {
        String name = value == null ? "document" : value.replaceAll("(?i)\\.pdf$", "");
        name = name.replaceAll("[\\\\/:*?\"<>|\\p{Cntrl}]", "-").trim();
        if (name.isEmpty()) name = "document";
        return name.length() > 40 ? name.substring(0, 40) : name;
    }

    private static String boundedName(String value, String extension) {
        return value.length() <= 80 ? value : value.substring(0, 80 - extension.length()) + extension;
    }

    private static void validatePdfHeader(BufferedInputStream input) throws IOException, PdfSplitException {
        input.mark(8);
        byte[] header = new byte[5];
        int count = input.read(header);
        input.reset();
        if (count != 5 || header[0] != '%' || header[1] != 'P' || header[2] != 'D' || header[3] != 'F' || header[4] != '-') {
            throw new PdfSplitException("INVALID_PDF", "The selected file is not a valid PDF.");
        }
    }

    private static void ensureNotCancelled(AtomicBoolean cancelRequested) throws PdfSplitException {
        if (cancelRequested != null && cancelRequested.get()) throw new PdfSplitException("CANCELLED", "The split was cancelled.");
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

    private static void deleteQuietly(File file) {
        if (file != null && file.exists()) file.delete();
    }
}
