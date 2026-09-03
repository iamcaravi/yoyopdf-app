package com.yoyopdf.app.pdf;

public final class PdfDeleteException extends Exception {
    private final String code;

    public PdfDeleteException(String code, String message) {
        super(message);
        this.code = code;
    }

    public PdfDeleteException(String code, String message, Throwable cause) {
        super(message, cause);
        this.code = code;
    }

    public String getCode() {
        return code;
    }
}
