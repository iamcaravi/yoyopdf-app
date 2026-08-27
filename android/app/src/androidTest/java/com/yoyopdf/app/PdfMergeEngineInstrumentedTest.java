package com.yoyopdf.app;

import static org.junit.Assert.assertEquals;

import android.content.Context;
import android.net.Uri;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import com.tom_roush.pdfbox.android.PDFBoxResourceLoader;
import com.tom_roush.pdfbox.pdmodel.PDDocument;
import com.tom_roush.pdfbox.pdmodel.PDPage;
import com.tom_roush.pdfbox.pdmodel.common.PDRectangle;
import com.yoyopdf.app.pdf.PdfMergeEngine;
import java.io.File;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.concurrent.atomic.AtomicBoolean;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;

@RunWith(AndroidJUnit4.class)
public class PdfMergeEngineInstrumentedTest {
    private Context context;
    private File directory;

    @Before
    public void setup() {
        context = InstrumentationRegistry.getInstrumentation().getTargetContext();
        PDFBoxResourceLoader.init(context);
        directory = new File(context.getCacheDir(), "merge-engine-test");
        directory.mkdirs();
    }

    @Test
    public void mergePreservesSourceAndPageOrder() throws Exception {
        File first = createPdf("first.pdf", 200f, 210f);
        File second = createPdf("second.pdf", 300f);
        File output = new File(directory, "merged.pdf");
        List<Integer> completed = new ArrayList<>();

        int pageCount = new PdfMergeEngine().merge(
            context,
            Arrays.asList(Uri.fromFile(first), Uri.fromFile(second)),
            output,
            new AtomicBoolean(false),
            (current, total) -> completed.add(current)
        );

        assertEquals(3, pageCount);
        assertEquals(Arrays.asList(1, 2), completed);
        try (PDDocument merged = PDDocument.load(output)) {
            assertEquals(3, merged.getNumberOfPages());
            assertEquals(200f, merged.getPage(0).getMediaBox().getWidth(), 0.01f);
            assertEquals(210f, merged.getPage(1).getMediaBox().getWidth(), 0.01f);
            assertEquals(300f, merged.getPage(2).getMediaBox().getWidth(), 0.01f);
        }
    }

    private File createPdf(String name, float... widths) throws Exception {
        File file = new File(directory, name);
        try (PDDocument document = new PDDocument()) {
            for (float width : widths) {
                document.addPage(new PDPage(new PDRectangle(width, 400f)));
            }
            document.save(file);
        }
        return file;
    }
}
