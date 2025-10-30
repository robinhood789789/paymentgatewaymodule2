import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { invokeFunctionWithTenant } from "@/lib/supabaseFunctions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";
import { Users, TrendingUp, Wallet, Clock, Search, Filter } from "lucide-react";

export default function PlatformPartners() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [commissionTypeFilter, setCommissionTypeFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["platform-partners", page, statusFilter, commissionTypeFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: "50",
      });
      
      if (statusFilter !== "all") params.append("status", statusFilter);
      if (commissionTypeFilter !== "all") params.append("commissionType", commissionTypeFilter);

      const { data, error } = await invokeFunctionWithTenant("platform-partners-list", {
        body: Object.fromEntries(params)
      });

      if (error) throw error;
      return data;
    },
  });

  const kpis = data?.kpis || {};
  const partners = data?.partners || [];
  const pagination = data?.pagination || {};

  const filteredPartners = searchTerm
    ? partners.filter((p: any) => 
        p.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.email?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : partners;

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold">จัดการพาร์ทเนอร์</h1>
        <p className="text-muted-foreground mt-2">
          ภาพรวมและจัดการพาร์ทเนอร์ (Shareholder) ทั้งหมดในระบบ
        </p>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">ฐานคำนวณเดือนนี้</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <div className="text-2xl font-bold">{formatCurrency(kpis.monthly_base || 0)}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">คอมมิชชันจ่ายเดือนนี้</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <div className="text-2xl font-bold">{formatCurrency(kpis.monthly_commission || 0)}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">ยอดค้างจ่าย</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <div className="text-2xl font-bold text-orange-600">{formatCurrency(kpis.total_pending || 0)}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Owner ที่ Active</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{kpis.active_clients || 0}</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>รายชื่อพาร์ทเนอร์</CardTitle>
          <CardDescription>จัดการและติดตามผลงานของพาร์ทเนอร์</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="ค้นหาชื่อหรืออีเมล..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">สถานะทั้งหมด</SelectItem>
                <SelectItem value="active">ใช้งาน</SelectItem>
                <SelectItem value="inactive">ไม่ใช้งาน</SelectItem>
              </SelectContent>
            </Select>
            <Select value={commissionTypeFilter} onValueChange={setCommissionTypeFilter}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ประเภททั้งหมด</SelectItem>
                <SelectItem value="revenue_share">Revenue Share</SelectItem>
                <SelectItem value="bounty">Bounty</SelectItem>
                <SelectItem value="hybrid">Hybrid</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredPartners.length > 0 ? (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>พาร์ทเนอร์</TableHead>
                    <TableHead>สถานะ</TableHead>
                    <TableHead>ประเภท</TableHead>
                    <TableHead>% เริ่มต้น</TableHead>
                    <TableHead>ฐานเดือนนี้</TableHead>
                    <TableHead>คอมมิชชันเดือนนี้</TableHead>
                    <TableHead>ค้างจ่าย</TableHead>
                    <TableHead>ลูกค้า</TableHead>
                    <TableHead>การดำเนินการ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPartners.map((partner: any) => (
                    <TableRow key={partner.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{partner.full_name}</div>
                          <div className="text-sm text-muted-foreground">{partner.email}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={partner.status === "active" ? "default" : "secondary"}>
                          {partner.status === "active" ? "ใช้งาน" : "ไม่ใช้งาน"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {partner.default_commission_type === "revenue_share" ? "Revenue Share" :
                           partner.default_commission_type === "bounty" ? "Bounty" : "Hybrid"}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-semibold">{partner.default_commission_value || 0}%</TableCell>
                      <TableCell>{formatCurrency(partner.monthly_base || 0)}</TableCell>
                      <TableCell className="font-semibold text-primary">
                        {formatCurrency(partner.monthly_commission || 0)}
                      </TableCell>
                      <TableCell className="text-orange-600">
                        {formatCurrency(partner.balance || 0)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{partner.active_clients_count || 0}</Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/platform/partners/${partner.id}`)}
                        >
                          เปิดดู
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
                    หน้า {pagination.page} จาก {pagination.totalPages} (รวม {pagination.total} รายการ)
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page === 1}
                      onClick={() => setPage(page - 1)}
                    >
                      ก่อนหน้า
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page === pagination.totalPages}
                      onClick={() => setPage(page + 1)}
                    >
                      ถัดไป
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              ไม่พบพาร์ทเนอร์
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
