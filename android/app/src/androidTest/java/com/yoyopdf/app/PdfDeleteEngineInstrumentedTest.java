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
import com.yoyopdf.app.pdf.PdfDeleteEngine;
import com.yoyopdf.app.pdf.PdfDeleteException;
import java.io.File;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.atomic.AtomicBoolean;
import org.junit.After;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;

@RunWith(AndroidJUnit4.class)
public class PdfDeleteEngineInstrumentedTest {
    private Context context;
    private File directory;
    private File source;

    @Before
    public void setup() throws Exception {
        context = InstrumentationRegistry.getInstrumentation().getTargetContext();
        PDFBoxResourceLoader.init(context);
        directory = new File(context.getCacheDir(), "delete-engine-test-" + System.nanoTime());
        assertTrue(directory.mkdirs());
        source = createPdf("source.pdf", 101f, 202f, 303f, 404f, 505f);
    }

    @After
    public void cleanup() {
        deleteRecursively(directory);
    }

    @Test
    public void deletesMiddlePageAndPreservesOrder() throws Exception {
        assertPdfWidths(run(source, Collections.singletonList(3), "middle.pdf"), 101f, 202f, 404f, 505f);
    }

    @Test
    public void deletesFirstPage() throws Exception {
        assertPdfWidths(run(source, Collections.singletonList(1), "first.pdf"), 202f, 303f, 404f, 505f);
    }

    @Test
    public void deletesLastPage() throws Exception {
        assertPdfWidths(run(source, Collections.singletonList(5), "last.pdf"), 101f, 202f, 303f, 404f);
    }

    @Test
    public void deletesMultipleNonContiguousPages() throws Exception {
        assertPdfWidths(run(source, Arrays.asList(2, 4), "multiple.pdf"), 101f, 303f, 505f);
        assertPdfWidths(run(source, Arrays.asList(1, 2, 3), "contiguous.pdf"), 404f, 505f);
    }

    @Test
    public void rejectsAllPagesEmptySelectionInvalidAndDuplicateIndexes() throws Exception {
        assertDeleteError(Arrays.asList(1, 2, 3, 4, 5), "DELETE_ALL_PAGES");
        assertDeleteError(Collections.emptyList(), "NO_PAGES_SELECTED");
        assertDeleteError(Collections.singletonList(6), "INVALID_PAGE_INDEX");
        assertDeleteError(Arrays.asList(2, 2), "INVALID_PAGE_INDEX");
    }

    @Test
    public void singlePagePdfCannotLoseItsOnlyPage() throws Exception {
        File single = createPdf("single.pdf", 777f);
        try {
            run(single, Collections.singletonList(1), "single-output.pdf");
            fail("Expected DELETE_ALL_PAGES");
        } catch (PdfDeleteException error) {
            assertEquals("DELETE_ALL_PAGES", error.getCode());
        }
    }

    @Test
    public void twoPagePdfCanKeepEitherPage() throws Exception {
        File two = createPdf("two.pdf", 111f, 222f);
        assertPdfWidths(run(two, Collections.singletonList(1), "keep-second.pdf"), 222f);
        assertPdfWidths(run(two, Collections.singletonList(2), "keep-first.pdf"), 111f);
    }

    private File run(File input, List<Integer> pages, String name) throws Exception {
        File output = new File(directory, name);
        int remaining = new PdfDeleteEngine().deletePages(context, Uri.fromFile(input), pages, output, new AtomicBoolean(false), null);
        assertEquals(countPages(input) - new java.util.HashSet<>(pages).size(), remaining);
        assertTrue(output.exists());
        return output;
    }

    private void assertDeleteError(List<Integer> pages, String expectedCode) throws Exception {
        try {
            run(source, pages, "invalid-" + expectedCode + "-" + pages.size() + ".pdf");
            fail("Expected " + expectedCode);
        } catch (PdfDeleteException error) {
            assertEquals(expectedCode, error.getCode());
        }
    }

    private int countPages(File file) throws Exception {
        try (PDDocument document = PDDocument.load(file)) {
            return document.getNumberOfPages();
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

    private void assertPdfWidths(File file, float... widths) throws Exception {
        try (PDDocument document = PDDocument.load(file)) {
            assertEquals(widths.length, document.getNumberOfPages());
            for (int index = 0; index < widths.length; index += 1) {
                assertEquals(widths[index], document.getPage(index).getMediaBox().getWidth(), 0.01f);
            }
        }
    }

    private static void deleteRecursively(File file) {
        if (file == null || !file.exists()) return;
        File[] children = file.listFiles();
        if (children != null) for (File child : children) deleteRecursively(child);
        file.delete();
    }
}
