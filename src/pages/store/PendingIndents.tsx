import { useEffect, useState } from "react";
import { ListTodo, ChevronLeft, ChevronRight, Download } from "lucide-react";
import { toast } from "sonner";
import { PuffLoader as Loader } from "react-spinners";

import Heading from "../../components/element/Heading";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../../components/ui/tabs";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { storeApi } from "../../services";
import Loading from "./Loading";

interface POData {
  PLANNED_TIMESTAMP: string;
  VRNO: string;
  VRDATE: string;
  VENDOR_NAME: string;
  ITEM_NAME: string;
  QTYORDER: number;
  QTYEXECUTE: number;
  BALANCE_QTY?: number;
  UM: string;
}

const PAGE_SIZE = 50;

interface PaginationBarProps {
  currentPage: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

function PaginationBar({
  currentPage,
  totalItems,
  pageSize,
  onPageChange,
}: PaginationBarProps) {
  if (totalItems === 0) return null;

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const startIndex = (currentPage - 1) * pageSize + 1;
  const endIndex = Math.min(currentPage * pageSize, totalItems);

  const pages: number[] = [];
  let start = Math.max(1, currentPage - 1);
  let end = Math.min(totalPages, start + 2);
  start = Math.max(1, end - 2);

  for (let i = start; i <= end; i++) pages.push(i);

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mt-3 text-sm text-muted-foreground">
      <span>
        Showing{" "}
        <span className="font-semibold">{startIndex.toLocaleString("en-IN")}</span>
        –
        <span className="font-semibold">{endIndex.toLocaleString("en-IN")}</span>{" "}
        of <span className="font-semibold">{totalItems.toLocaleString("en-IN")}</span>
      </span>

      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>

        {pages.map((p) => (
          <Button
            key={p}
            variant={p === currentPage ? "default" : "outline"}
            size="icon"
            onClick={() => onPageChange(p)}
          >
            {p}
          </Button>
        ))}

        <Button
          variant="ghost"
          size="icon"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

const formatDate = (dateString?: string) => {
  if (!dateString) return "";
  return new Date(dateString).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const formatDateTime = (dateString?: string) => {
  if (!dateString) return "";
  return new Date(dateString).toLocaleString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
};

const normalize = (po: Partial<POData>): POData => {
  const order = po.QTYORDER ?? 0;
  const exec = po.QTYEXECUTE ?? 0;
  const balance = po.BALANCE_QTY != null ? po.BALANCE_QTY : Math.max(order - exec, 0);

  return {
    PLANNED_TIMESTAMP: po.PLANNED_TIMESTAMP ?? "",
    VRNO: po.VRNO ?? "",
    VRDATE: po.VRDATE ?? "",
    VENDOR_NAME: po.VENDOR_NAME ?? "",
    ITEM_NAME: po.ITEM_NAME ?? "",
    UM: po.UM ?? "",
    QTYORDER: order,
    QTYEXECUTE: exec,
    BALANCE_QTY: balance,
  };
};

export default function PendingIndents() {
  const [pendingAll, setPendingAll] = useState<POData[]>([]);
  const [historyAll, setHistoryAll] = useState<POData[]>([]);
  const [pendingSearch, setPendingSearch] = useState("");
  const [historySearch, setHistorySearch] = useState("");
  const [pendingPage, setPendingPage] = useState(1);
  const [historyPage, setHistoryPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [downloadingPending, setDownloadingPending] = useState(false);
  const [downloadingHistory, setDownloadingHistory] = useState(false);

  const fetchPendingAll = async () => {
    const res = await storeApi.getPoPending();
    const data = (res as any)?.data ?? res;
    const rows = Array.isArray(data) ? data : [];
    setPendingAll(rows.map(normalize));
    setPendingPage(1);
  };

  const fetchHistoryAll = async () => {
    const res = await storeApi.getPoHistory();
    const data = (res as any)?.data ?? res;
    const rows = Array.isArray(data) ? data : [];
    setHistoryAll(rows.map(normalize));
    setHistoryPage(1);
  };

  const fetchInitial = async () => {
    try {
      setLoading(true);
      await Promise.all([fetchPendingAll(), fetchHistoryAll()]);
    } catch (err) {
      console.error(err);
      toast.error("Failed to fetch purchase orders");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (type: "pending" | "history") => {
    const setLoadingState =
      type === "pending" ? setDownloadingPending : setDownloadingHistory;
    const downloader =
      type === "pending" ? storeApi.downloadPoPending : storeApi.downloadPoHistory;
    const fileName =
      type === "pending"
        ? "pending-purchase-orders.xlsx"
        : "received-purchase-orders.xlsx";

    try {
      setLoadingState(true);
      const blob = await downloader();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(`Failed to download ${type} purchase orders`, err);
      toast.error("Unable to download the file right now.");
    } finally {
      setLoadingState(false);
    }
  };

  useEffect(() => {
    fetchInitial();
  }, []);

  const pendingQuery = pendingSearch.trim().toLowerCase();
  const pendingFiltered = pendingQuery
    ? pendingAll.filter((row) => {
        const q = pendingQuery;
        return (
          (row.VRNO || "").toLowerCase().includes(q) ||
          (row.VENDOR_NAME || "").toLowerCase().includes(q) ||
          (row.ITEM_NAME || "").toLowerCase().includes(q)
        );
      })
    : pendingAll;

  const historyQuery = historySearch.trim().toLowerCase();
  const historyFiltered = historyQuery
    ? historyAll.filter((row) => {
        const q = historyQuery;
        return (
          (row.VRNO || "").toLowerCase().includes(q) ||
          (row.VENDOR_NAME || "").toLowerCase().includes(q) ||
          (row.ITEM_NAME || "").toLowerCase().includes(q)
        );
      })
    : historyAll;

  const pendingTotal = pendingFiltered.length;
  const pendingTotalPages = Math.max(1, Math.ceil(pendingTotal / PAGE_SIZE) || 1);
  const pendingCurrentPage = Math.min(pendingPage, pendingTotalPages);
  const pendingStartIndex = (pendingCurrentPage - 1) * PAGE_SIZE;
  const pendingPageRows = pendingFiltered.slice(
    pendingStartIndex,
    pendingStartIndex + PAGE_SIZE
  );

  const historyTotal = historyFiltered.length;
  const historyTotalPages = Math.max(1, Math.ceil(historyTotal / PAGE_SIZE) || 1);
  const historyCurrentPage = Math.min(historyPage, historyTotalPages);
  const historyStartIndex = (historyCurrentPage - 1) * PAGE_SIZE;
  const historyPageRows = historyFiltered.slice(
    historyStartIndex,
    historyStartIndex + PAGE_SIZE
  );

  if (loading) {
    return (
      <Loading
        heading="Purchase Orders"
        subtext="Loading pending and received purchase orders"
        icon={<ListTodo size={48} className="text-blue-600" />}
      />
    );
  }

  return (
    <div className="w-full p-4 md:p-6 lg:p-8">
      <Heading heading="Purchase Orders" subtext="Pending & Received purchase orders">
        <ListTodo size={50} className="text-primary" />
      </Heading>

      <Tabs defaultValue="pending" className="mt-6 w-full">
        <TabsList className="grid grid-cols-2 w-full mb-4">
          <TabsTrigger value="pending" className="w-full py-2 text-center">
            Pending POs
          </TabsTrigger>
          <TabsTrigger value="received" className="w-full py-2 text-center">
            Received POs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <Input
              placeholder="Search: PO No / Vendor / Item"
              value={pendingSearch}
              onChange={(e) => {
                setPendingSearch(e.target.value);
                setPendingPage(1);
              }}
              className="w-full sm:w-[400px] md:w-[500px]"
            />
            <Button
              onClick={() => handleDownload("pending")}
              disabled={downloadingPending}
              className="w-full sm:w-auto whitespace-nowrap bg-green-600 hover:bg-green-700 text-white"
            >
              {downloadingPending ? (
                <div className="flex items-center gap-2">
                  <Loader size={14} color="currentColor" />
                  Downloading...
                </div>
              ) : (
                <>
                  <Download size={16} className="mr-2" />
                  Download Pending Excel
                </>
              )}
            </Button>
          </div>

          <div className="relative w-full">
            <div className="overflow-x-auto max-h-[calc(100vh-350px)] overflow-y-auto border rounded-xl bg-white shadow-sm">
              <table className="w-full text-xs border-collapse min-w-[1000px]">
                <thead className="sticky top-0 z-20 bg-slate-100 shadow-sm">
                  <tr>
                    <th className="sticky left-0 z-30 bg-slate-100 border-b px-3 py-2 text-left font-semibold">
                      PO No.
                    </th>
                    <th className="bg-slate-100 border-b px-3 py-2 text-center font-semibold">S.No</th>
                    <th className="bg-slate-100 border-b px-3 py-2 font-semibold">Planned Time Stamp</th>
                    <th className="bg-slate-100 border-b px-3 py-2 font-semibold">PO Date</th>
                    <th className="bg-slate-100 border-b px-3 py-2 font-semibold">Vendor Name</th>
                    <th className="bg-slate-100 border-b px-3 py-2 font-semibold">Item Name</th>
                    <th className="bg-slate-100 border-b px-3 py-2 font-semibold">UOM</th>
                    <th className="bg-slate-100 border-b px-3 py-2 font-semibold">Ordered Qty</th>
                    <th className="bg-slate-100 border-b px-3 py-2 font-semibold">Executed Qty</th>
                    <th className="bg-slate-100 border-b px-3 py-2 font-semibold">Balance Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={10} className="py-6 text-center text-slate-500 text-sm">
                        <div className="flex items-center justify-center gap-2">
                          <Loader size={16} />
                          Loading...
                        </div>
                      </td>
                    </tr>
                  ) : pendingPageRows.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-6 text-center text-slate-400 text-sm">
                        No Pending POs Found
                      </td>
                    </tr>
                  ) : (
                    pendingPageRows.map((row, index) => (
                      <tr key={row.VRNO + index} className="hover:bg-slate-50">
                        <td className="sticky left-0 z-10 bg-white border-b px-3 py-1 text-left font-medium">
                          {row.VRNO}
                        </td>
                        <td className="border-b px-2 py-1 text-center">
                          {pendingStartIndex + index + 1}
                        </td>
                        <td className="border-b px-2 py-1">
                          {formatDateTime(row.PLANNED_TIMESTAMP)}
                        </td>
                        <td className="border-b px-2 py-1">{formatDate(row.VRDATE)}</td>
                        <td className="border-b px-2 py-1">{row.VENDOR_NAME}</td>
                        <td className="border-b px-2 py-1">{row.ITEM_NAME}</td>
                        <td className="border-b px-2 py-1">{row.UM}</td>
                        <td className="border-b px-2 py-1">{row.QTYORDER}</td>
                        <td className="border-b px-2 py-1">{row.QTYEXECUTE}</td>
                        <td className="border-b px-2 py-1">{row.BALANCE_QTY ?? 0}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <PaginationBar
            currentPage={pendingCurrentPage}
            totalItems={pendingTotal}
            pageSize={PAGE_SIZE}
            onPageChange={(p) => setPendingPage(Math.max(1, p))}
          />
        </TabsContent>

        <TabsContent value="received">
          <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <Input
              placeholder="Search: PO No / Vendor / Item"
              value={historySearch}
              onChange={(e) => {
                setHistorySearch(e.target.value);
                setHistoryPage(1);
              }}
              className="w-full sm:flex-1"
            />
            <Button
              onClick={() => handleDownload("history")}
              disabled={downloadingHistory}
              className="w-full sm:w-auto whitespace-nowrap bg-green-600 hover:bg-green-700 text-white"
            >
              {downloadingHistory ? (
                <div className="flex items-center gap-2">
                  <Loader size={14} color="currentColor" />
                  Downloading...
                </div>
              ) : (
                <>
                  <Download size={16} className="mr-2" />
                  Download Received Excel
                </>
              )}
            </Button>
          </div>

          <div className="relative w-full">
            <div className="overflow-x-auto max-h-[calc(100vh-350px)] overflow-y-auto border rounded-xl bg-white shadow-sm">
              <table className="w-full text-xs border-collapse min-w-[1000px]">
                <thead className="sticky top-0 z-20 bg-slate-100 shadow-sm">
                  <tr>
                    <th className="sticky left-0 z-30 bg-slate-100 border-b px-3 py-2 text-left font-semibold">
                      PO No.
                    </th>
                    <th className="bg-slate-100 border-b px-3 py-2 text-center font-semibold">S.No</th>
                    <th className="bg-slate-100 border-b px-3 py-2 font-semibold">Planned Time Stamp</th>
                    <th className="bg-slate-100 border-b px-3 py-2 font-semibold">PO Date</th>
                    <th className="bg-slate-100 border-b px-3 py-2 font-semibold">Vendor Name</th>
                    <th className="bg-slate-100 border-b px-3 py-2 font-semibold">Item Name</th>
                    <th className="bg-slate-100 border-b px-3 py-2 font-semibold">UOM</th>
                    <th className="bg-slate-100 border-b px-3 py-2 font-semibold">Ordered Qty</th>
                    <th className="bg-slate-100 border-b px-3 py-2 font-semibold">Executed Qty</th>
                    <th className="bg-slate-100 border-b px-3 py-2 font-semibold">Balance Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={10} className="py-6 text-center text-slate-500 text-sm">
                        <div className="flex items-center justify-center gap-2">
                          <Loader size={16} />
                          Loading...
                        </div>
                      </td>
                    </tr>
                  ) : historyPageRows.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-6 text-center text-slate-400 text-sm">
                        No Received POs Found
                      </td>
                    </tr>
                  ) : (
                    historyPageRows.map((row, index) => (
                      <tr key={row.VRNO + index} className="hover:bg-slate-50">
                        <td className="sticky left-0 z-10 bg-white border-b px-3 py-1 text-left font-medium">
                          {row.VRNO}
                        </td>
                        <td className="border-b px-2 py-1 text-center">
                          {historyStartIndex + index + 1}
                        </td>
                        <td className="border-b px-2 py-1">
                          {formatDateTime(row.PLANNED_TIMESTAMP)}
                        </td>
                        <td className="border-b px-2 py-1">{formatDate(row.VRDATE)}</td>
                        <td className="border-b px-2 py-1">{row.VENDOR_NAME}</td>
                        <td className="border-b px-2 py-1">{row.ITEM_NAME}</td>
                        <td className="border-b px-2 py-1">{row.UM}</td>
                        <td className="border-b px-2 py-1">{row.QTYORDER}</td>
                        <td className="border-b px-2 py-1">{row.QTYEXECUTE}</td>
                        <td className="border-b px-2 py-1">{row.BALANCE_QTY ?? 0}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <PaginationBar
            currentPage={historyCurrentPage}
            totalItems={historyTotal}
            pageSize={PAGE_SIZE}
            onPageChange={(p) => setHistoryPage(Math.max(1, p))}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
