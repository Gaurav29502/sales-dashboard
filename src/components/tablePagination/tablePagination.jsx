import React, { useEffect, useState } from "react";
import "./tablePagination.css";

export const useTablePagination = (rows) => {
  const [pageSize, setPageSize] = useState(100);
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  useEffect(() => { setPage(1); }, [rows]);
  return {
    pageRows: rows.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    page: currentPage,
    setPage,
    pageSize,
    setPageSize: (value) => { setPageSize(Number(value)); setPage(1); },
    totalPages,
    totalRows: rows.length,
    firstRow: rows.length ? (currentPage - 1) * pageSize + 1 : 0,
    lastRow: Math.min(currentPage * pageSize, rows.length),
  };
};

export const downloadCsv = (fileName, columns, rows) => {
  const escapeCell = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;
  const contents = [columns, ...rows].map((row) => row.map(escapeCell).join(",")).join("\r\n");
  const blob = new Blob(["\uFEFF", contents], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
};

export const TablePagination = ({ pagination, csvColumns = [], csvRows = [], fileName = "table.csv" }) => (
  <div className="tablePagination" aria-label="Table pagination">
    <button type="button" className="tableCsvButton" onClick={() => downloadCsv(fileName, csvColumns, csvRows)}>Export CSV</button>
    <label className="tablePageSize">Rows per page
      <select aria-label="Rows per page" value={pagination.pageSize} onChange={(event) => pagination.setPageSize(event.target.value)}>
        {[10, 20, 50, 100].map((size) => <option key={size} value={size}>{size}</option>)}
      </select>
    </label>
    <span className="tablePageSummary">{pagination.firstRow}–{pagination.lastRow} of {pagination.totalRows}</span>
    <div className="tablePageButtons">
      <button type="button" aria-label="Previous page" disabled={pagination.page <= 1} onClick={() => pagination.setPage((page) => Math.max(1, page - 1))}>‹</button>
      <span>Page {pagination.page} of {pagination.totalPages}</span>
      <button type="button" aria-label="Next page" disabled={pagination.page >= pagination.totalPages} onClick={() => pagination.setPage((page) => Math.min(pagination.totalPages, page + 1))}>›</button>
    </div>
  </div>
);
