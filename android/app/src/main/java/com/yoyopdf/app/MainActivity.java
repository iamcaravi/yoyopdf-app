package com.yoyopdf.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.yoyopdf.app.pdf.PdfDocumentsPlugin;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        registerPlugin(PdfDocumentsPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
