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
import com.yoyopdf.app.pdf.PdfReorderEngine;
import com.yoyopdf.app.pdf.PdfReorderException;
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
public class PdfReorderEngineInstrumentedTest {
    private Context context;
    private File directory;
    private File source;

    @Before
    public void setup() throws Exception {
        context = InstrumentationRegistry.getInstrumentation().getTargetContext();
        PDFBoxResourceLoader.init(context);
        directory = new File(context.getCacheDir(), "reorder-engine-test-" + System.nanoTime());
        assertTrue(directory.mkdirs());
        source = createPdf("source.pdf", 101f, 202f, 303f, 404f);
    }

    @After
    public void cleanup() {
        deleteRecursively(directory);
    }

    @Test
    public void identityOrderPreservesEveryPage() throws Exception {
        File output = reorder(source, Arrays.asList(1, 2, 3, 4), "identity.pdf");
        assertPdfWidths(output, 101f, 202f, 303f, 404f);
    }

    @Test
    public void reversedOrderIsWrittenExactly() throws Exception {
        File output = reorder(source, Arrays.asList(4, 3, 2, 1), "reversed.pdf");
        assertPdfWidths(output, 404f, 303f, 202f, 101f);
    }

    @Test
    public void arbitraryOrderAndProgressAreExact() throws Exception {
        File output = new File(directory, "arbitrary.pdf");
        List<Integer> progress = new java.util.ArrayList<>();
        int count = new PdfReorderEngine().reorder(
            context,
            Uri.fromFile(source),
            Arrays.asList(2, 4, 1, 3),
            output,
            new AtomicBoolean(false),
            (completed, total) -> progress.add(completed)
        );
        assertEquals(4, count);
        assertEquals(Arrays.asList(1, 2, 3, 4), progress);
        assertPdfWidths(output, 202f, 404f, 101f, 303f);
    }

    @Test
    public void rejectsDuplicateMissingAndOutOfRangeIndexes() throws Exception {
        assertReorderError(Arrays.asList(1, 2, 2, 4), "INVALID_PAGE_ORDER");
        assertReorderError(Arrays.asList(1, 2, 3), "INVALID_PAGE_ORDER");
        assertReorderError(Arrays.asList(1, 2, 3, 5), "INVALID_PAGE_ORDER");
        assertReorderError(Collections.emptyList(), "EMPTY_PAGE_ORDER");
    }

    @Test
    public void singlePagePdfProducesOnePageOutput() throws Exception {
        File single = createPdf("single.pdf", 777f);
        File output = reorder(single, Collections.singletonList(1), "single-reordered.pdf");
        assertPdfWidths(output, 777f);
    }

    private File reorder(File input, List<Integer> order, String name) throws Exception {
        File output = new File(directory, name);
        int count = new PdfReorderEngine().reorder(context, Uri.fromFile(input), order, output, new AtomicBoolean(false), null);
        assertEquals(order.size(), count);
        assertTrue(output.exists());
        return output;
    }

    private void assertReorderError(List<Integer> order, String expectedCode) throws Exception {
        try {
            reorder(source, order, "invalid-" + expectedCode + "-" + order.size() + ".pdf");
            fail("Expected " + expectedCode);
        } catch (PdfReorderException error) {
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
