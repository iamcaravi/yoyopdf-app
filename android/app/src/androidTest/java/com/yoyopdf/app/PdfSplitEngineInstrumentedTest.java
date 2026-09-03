package com.yoyopdf.app;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertTrue;
import static org.junit.Assert.fail;

import android.content.Context;
import android.net.Uri;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import com.tom_roush.pdfbox.android.PDFBoxResourceLoader;
import com.tom_roush.pdfbox.pdmodel.PDDocument;
import com.tom_roush.pdfbox.pdmodel.PDPage;
import com.tom_roush.pdfbox.pdmodel.common.PDRectangle;
import com.yoyopdf.app.pdf.PdfSplitEngine;
import com.yoyopdf.app.pdf.PdfSplitException;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;

@RunWith(AndroidJUnit4.class)
public class PdfSplitEngineInstrumentedTest {
    private Context context;
    private File directory;
    private File source;

    @Before
    public void setup() throws Exception {
        context = InstrumentationRegistry.getInstrumentation().getTargetContext();
        PDFBoxResourceLoader.init(context);
        directory = new File(context.getCacheDir(), "split-engine-test-" + System.nanoTime());
        assertTrue(directory.mkdirs());
        source = createPdf("source.pdf", 101f, 202f, 303f, 404f, 505f);
    }

    @Test
    public void extractsOnePageToPdf() throws Exception {
        PdfSplitEngine.Result result = split(Collections.singletonList(Collections.singletonList(3)), "one");

        assertEquals("application/pdf", result.getMimeType());
        assertEquals(1, result.getOutputCount());
        assertEquals(1, result.getPageCount());
        assertTrue(result.getFile().exists());
        assertPdfWidths(result.getFile(), 303f);
    }

    @Test
    public void preservesFirstMiddleAndLastRangesInZip() throws Exception {
        List<List<Integer>> groups = Arrays.asList(
            Collections.singletonList(1),
            Arrays.asList(2, 3),
            Collections.singletonList(5)
        );
        PdfSplitEngine.Result result = split(groups, "ranges");

        assertEquals("application/zip", result.getMimeType());
        assertEquals(3, result.getOutputCount());
        assertEquals(4, result.getPageCount());
        Map<String, byte[]> entries = readZip(result.getFile());
        assertEquals(3, entries.size());
        assertPdfWidths(entries.get("source_page_1.pdf"), 101f);
        assertPdfWidths(entries.get("source_split_2-3.pdf"), 202f, 303f);
        assertPdfWidths(entries.get("source_page_5.pdf"), 505f);
    }

    @Test
    public void fixedTwoPagesPerFileCreatesThreeOutputs() throws Exception {
        List<List<Integer>> groups = Arrays.asList(
            Arrays.asList(1, 2),
            Arrays.asList(3, 4),
            Collections.singletonList(5)
        );
        PdfSplitEngine.Result result = split(groups, "fixed");

        assertEquals(3, result.getOutputCount());
        assertEquals(5, result.getPageCount());
        assertEquals(3, readZip(result.getFile()).size());
    }

    @Test
    public void rejectsEmptySelectionAndOutOfBoundsPages() throws Exception {
        assertSplitError(Collections.emptyList(), "NO_PAGES_SELECTED");
        assertSplitError(Collections.singletonList(Collections.singletonList(6)), "RANGE_OUT_OF_BOUNDS");
        assertSplitError(Collections.singletonList(Collections.emptyList()), "NO_PAGES_SELECTED");
    }

    @Test
    public void reportsProgressForEveryCreatedOutput() throws Exception {
        List<Integer> progress = new ArrayList<>();
        PdfSplitEngine.Result result = new PdfSplitEngine().split(
            context,
            Uri.fromFile(source),
            Arrays.asList(Collections.singletonList(1), Collections.singletonList(5)),
            new File(directory, "progress"),
            source.getName(),
            new AtomicBoolean(false),
            (completed, total) -> progress.add(completed)
        );

        assertTrue(result.getFile().exists());
        assertEquals(Arrays.asList(1, 2), progress);
    }

    private PdfSplitEngine.Result split(List<List<Integer>> groups, String name) throws Exception {
        return new PdfSplitEngine().split(
            context,
            Uri.fromFile(source),
            groups,
            new File(directory, name),
            source.getName(),
            new AtomicBoolean(false),
            null
        );
    }

    private void assertSplitError(List<List<Integer>> groups, String expectedCode) throws Exception {
        try {
            split(groups, "invalid-" + expectedCode);
            fail("Expected " + expectedCode);
        } catch (PdfSplitException error) {
            assertEquals(expectedCode, error.getCode());
        }
    }

    private File createPdf(String name, float... widths) throws Exception {
        File file = new File(directory, name);
        try (PDDocument document = new PDDocument()) {
            for (float width : widths) document.addPage(new PDPage(new PDRectangle(width, 700f)));
            document.save(file);
        }
        return file;
    }

    private Map<String, byte[]> readZip(File file) throws Exception {
        Map<String, byte[]> entries = new LinkedHashMap<>();
        byte[] buffer = new byte[8192];
        try (ZipInputStream zip = new ZipInputStream(new FileInputStream(file))) {
            ZipEntry entry;
            while ((entry = zip.getNextEntry()) != null) {
                ByteArrayOutputStream bytes = new ByteArrayOutputStream();
                int read;
                while ((read = zip.read(buffer)) != -1) bytes.write(buffer, 0, read);
                entries.put(entry.getName(), bytes.toByteArray());
                zip.closeEntry();
            }
        }
        return entries;
    }

    private void assertPdfWidths(File file, float... widths) throws Exception {
        try (PDDocument document = PDDocument.load(file)) {
            assertWidths(document, widths);
        }
    }

    private void assertPdfWidths(byte[] bytes, float... widths) throws Exception {
        assertTrue(bytes != null);
        try (PDDocument document = PDDocument.load(bytes)) {
            assertWidths(document, widths);
        }
    }

    private void assertWidths(PDDocument document, float... widths) {
        assertEquals(widths.length, document.getNumberOfPages());
        for (int index = 0; index < widths.length; index += 1) {
            assertEquals(widths[index], document.getPage(index).getMediaBox().getWidth(), 0.01f);
        }
    }
}
