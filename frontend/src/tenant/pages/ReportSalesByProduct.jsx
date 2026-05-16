import { useEffect, useMemo, useState } from 'react';
import {
  Button, Card, Col, Row, Select, Space, Spin, Statistic, Table, Typography,
} from 'antd';
import { PrinterOutlined, ReloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import PageHeader from '@shared/components/PageHeader';
import ReportDateRangePicker from '@shared/components/ReportDateRangePicker';
import { categoriesApi, productsApi, reportsApi } from '@api/tenant.api';

const { Text } = Typography;

const fmt = (v) => Number(v ?? 0).toLocaleString('vi-VN');
const fmtPct = (v) => `${Number(v ?? 0).toFixed(2)}%`;

const defaultRange = [dayjs().startOf('month'), dayjs()];

function collectDescendantCategoryIds(categories, rootId) {
  if (!rootId) return new Set();

  const descendants = new Set([rootId]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const category of categories) {
      if (!descendants.has(category.id) && category.parentId && descendants.has(category.parentId)) {
        descendants.add(category.id);
        changed = true;
      }
    }
  }

  return descendants;
}

export default function ReportSalesByProduct() {
  const [dateRange, setDateRange] = useState(defaultRange);
  const [products, setProducts] = useState([]);
  const [selectedProductIds, setSelectedProductIds] = useState([]);
  const [categoryId, setCategoryId] = useState(undefined);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    categoriesApi.flat().then((res) => {
      setCategories(res.data?.data ?? res.data ?? []);
    });

    productsApi.list({ limit: 500, isActive: true }).then((res) => {
      setProducts(res.data?.data?.data ?? res.data?.data ?? []);
    });
  }, []);

  const categoryOptions = useMemo(
    () => categories.map((category) => ({ value: category.id, label: category.name })),
    [categories],
  );

  const allowedCategoryIds = useMemo(
    () => collectDescendantCategoryIds(categories, categoryId),
    [categories, categoryId],
  );

  const productOptions = useMemo(() => products
    .filter((product) => !categoryId || allowedCategoryIds.has(product.categoryId))
    .map((product) => ({
      value: product.id,
      label: `${product.sku} - ${product.name}`,
      searchText: `${product.sku ?? ''} ${product.name ?? ''}`.toLowerCase(),
    })), [products, categoryId, allowedCategoryIds]);

  useEffect(() => {
    const allowedIds = new Set(productOptions.map((product) => product.value));
    setSelectedProductIds((prev) => prev.filter((id) => allowedIds.has(id)));
  }, [productOptions]);

  const load = () => {
    setLoading(true);
    reportsApi.salesByProduct({
      from:        dateRange?.[0]?.format('YYYY-MM-DD'),
      to:          dateRange?.[1]?.format('YYYY-MM-DD'),
      productIds:  selectedProductIds.length ? selectedProductIds.join(',') : undefined,
      categoryId:  categoryId || undefined,
    })
      .then((res) => setResult(res.data?.data ?? res.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [dateRange, selectedProductIds, categoryId]);

  const summary = result?.summary ?? {};
  const data = result?.data ?? [];

  const columns = [
    {
      title: 'STT', key: 'stt', width: 55, align: 'center',
      render: (_, __, i) => i + 1,
    },
    {
      title: 'Mã SP', dataIndex: 'product_code', key: 'product_code', width: 100,
      sorter: (a, b) => (a.product_code ?? '').localeCompare(b.product_code ?? ''),
    },
    {
      title: 'Tên sản phẩm', dataIndex: 'product_name', key: 'product_name',
      sorter: (a, b) => (a.product_name ?? '').localeCompare(b.product_name ?? ''),
    },
    { title: 'Danh mục', dataIndex: 'category_name', key: 'category_name', width: 120 },
    { title: 'ĐVT', dataIndex: 'unit', key: 'unit', width: 70, align: 'center' },
    {
      title: 'SL bán', dataIndex: 'quantity_sold', key: 'quantity_sold',
      align: 'right', width: 90,
      render: (v) => fmt(v),
      sorter: (a, b) => a.quantity_sold - b.quantity_sold,
    },
    {
      title: 'Đơn giá TB', dataIndex: 'avg_price', key: 'avg_price',
      align: 'right', width: 115,
      render: (v) => fmt(v),
      sorter: (a, b) => a.avg_price - b.avg_price,
    },
    {
      title: 'Doanh thu', dataIndex: 'total_revenue', key: 'total_revenue',
      align: 'right', width: 120,
      render: (v) => fmt(v),
      sorter: (a, b) => a.total_revenue - b.total_revenue,
    },
    {
      title: 'Chiết khấu', dataIndex: 'total_discount', key: 'total_discount',
      align: 'right', width: 110,
      render: (v) => fmt(v),
      sorter: (a, b) => a.total_discount - b.total_discount,
    },
    {
      title: 'DT thuần', dataIndex: 'net_revenue', key: 'net_revenue',
      align: 'right', width: 120,
      render: (v) => <Text strong>{fmt(v)}</Text>,
      sorter: (a, b) => a.net_revenue - b.net_revenue,
      defaultSortOrder: 'descend',
    },
    {
      title: 'Tỷ trọng', dataIndex: 'revenue_ratio', key: 'revenue_ratio',
      align: 'right', width: 90,
      render: (v) => <Text type="secondary">{fmtPct(v)}</Text>,
      sorter: (a, b) => a.revenue_ratio - b.revenue_ratio,
    },
  ];

  const summaryRow = () => (
    <Table.Summary.Row style={{ fontWeight: 600, background: '#fafafa' }}>
      <Table.Summary.Cell index={0} colSpan={5} align="center">
        <Text strong>Tổng cộng</Text>
      </Table.Summary.Cell>
      <Table.Summary.Cell index={5} align="right">
        <Text strong>{fmt(summary.total_quantity_sold)}</Text>
      </Table.Summary.Cell>
      <Table.Summary.Cell index={6} />
      <Table.Summary.Cell index={7} align="right">
        <Text strong>{fmt(summary.total_revenue)}</Text>
      </Table.Summary.Cell>
      <Table.Summary.Cell index={8} align="right">
        <Text strong>{fmt(summary.total_discount)}</Text>
      </Table.Summary.Cell>
      <Table.Summary.Cell index={9} align="right">
        <Text strong>{fmt(summary.total_net_revenue)}</Text>
      </Table.Summary.Cell>
      <Table.Summary.Cell index={10} align="right">
        <Text strong>100%</Text>
      </Table.Summary.Cell>
    </Table.Summary.Row>
  );

  const handlePrint = () => {
    const from = dateRange?.[0]?.format('DD/MM/YYYY') ?? '';
    const to = dateRange?.[1]?.format('DD/MM/YYYY') ?? '';
    const w = window.open('', '_blank');
    w.document.write(`
      <html>
        <head>
          <title>Doanh thu bán hàng theo sản phẩm</title>
          <style>
            body { font-family: Arial, sans-serif; font-size: 12px; margin: 20px; }
            h3 { text-align: center; margin: 4px 0; }
            p.period { text-align: center; font-size: 11px; margin-bottom: 12px; }
            table { width: 100%; border-collapse: collapse; font-size: 11px; }
            th, td { border: 1px solid #ccc; padding: 4px 6px; }
            th { background: #f0f0f0; text-align: center; }
            td.right { text-align: right; }
            td.center { text-align: center; }
            .total-row { font-weight: bold; background: #f9f9f9; }
            .footer { display: flex; justify-content: space-around; margin-top: 40px; text-align: center; }
            .footer div { width: 200px; }
            .footer p { margin: 4px 0; }
            @media print { @page { margin: 15mm; } }
          </style>
        </head>
        <body>
          <h3>BÁO CÁO DOANH THU BÁN HÀNG THEO SẢN PHẨM</h3>
          <p class="period">Từ ngày: ${from}&nbsp;&nbsp;-&nbsp;&nbsp;Đến ngày: ${to}</p>
          <table>
            <thead>
              <tr>
                <th>STT</th><th>Mã SP</th><th>Tên sản phẩm</th><th>Danh mục</th><th>ĐVT</th>
                <th>SL bán</th><th>Đơn giá TB</th><th>Doanh thu</th>
                <th>Chiết khấu</th><th>DT thuần</th><th>Tỷ trọng</th>
              </tr>
            </thead>
            <tbody>
              ${data.map((row, index) => `
                <tr>
                  <td class="center">${index + 1}</td>
                  <td class="center">${row.product_code}</td>
                  <td>${row.product_name}</td>
                  <td class="center">${row.category_name}</td>
                  <td class="center">${row.unit ?? ''}</td>
                  <td class="right">${fmt(row.quantity_sold)}</td>
                  <td class="right">${fmt(row.avg_price)}</td>
                  <td class="right">${fmt(row.total_revenue)}</td>
                  <td class="right">${fmt(row.total_discount)}</td>
                  <td class="right">${fmt(row.net_revenue)}</td>
                  <td class="right">${fmtPct(row.revenue_ratio)}</td>
                </tr>
              `).join('')}
              <tr class="total-row">
                <td class="center" colspan="5">Tổng cộng</td>
                <td class="right">${fmt(summary.total_quantity_sold)}</td>
                <td></td>
                <td class="right">${fmt(summary.total_revenue)}</td>
                <td class="right">${fmt(summary.total_discount)}</td>
                <td class="right">${fmt(summary.total_net_revenue)}</td>
                <td class="right">100%</td>
              </tr>
            </tbody>
          </table>
          <div class="footer">
            <div>
              <p><strong>KẾ TOÁN VIÊN</strong></p>
              <p><em>(Ký, ghi rõ họ tên)</em></p>
              <br/><br/><br/>
              <p>................................</p>
            </div>
            <div>
              <p><strong>KẾ TOÁN TRƯỞNG</strong></p>
              <p><em>(Ký, ghi rõ họ tên)</em></p>
              <br/><br/><br/>
              <p>................................</p>
            </div>
          </div>
        </body>
      </html>
    `);
    w.document.close();
    w.focus();
    w.print();
    w.close();
  };

  return (
    <div>
      <PageHeader
        title="Doanh thu bán hàng theo sản phẩm"
        extra={<Button icon={<PrinterOutlined />} onClick={handlePrint}>In báo cáo</Button>}
      />

      <Card size="small" style={{ marginBottom: 16 }}>
        <Space wrap>
          <ReportDateRangePicker value={dateRange} onChange={setDateRange} />
          <Select
            mode="multiple"
            allowClear
            showSearch
            maxTagCount="responsive"
            placeholder="Chọn sản phẩm (để trống = tất cả)"
            options={productOptions}
            value={selectedProductIds}
            onChange={setSelectedProductIds}
            optionFilterProp="searchText"
            style={{ width: 280 }}
          />
          <Select
            allowClear
            placeholder="Tất cả danh mục"
            options={categoryOptions}
            value={categoryId}
            onChange={setCategoryId}
            style={{ width: 180 }}
          />
          <Button icon={<ReloadOutlined />} onClick={load} loading={loading}>
            Làm mới
          </Button>
        </Space>
      </Card>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic
              title="Tổng SL bán"
              value={summary.total_quantity_sold ?? 0}
              formatter={(v) => fmt(v)}
              valueStyle={{ fontSize: 16 }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic
              title="Doanh thu"
              value={summary.total_revenue ?? 0}
              formatter={(v) => fmt(v)}
              suffix="₫"
              valueStyle={{ fontSize: 16, color: '#1677ff' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic
              title="Chiết khấu"
              value={summary.total_discount ?? 0}
              formatter={(v) => fmt(v)}
              suffix="₫"
              valueStyle={{ fontSize: 16, color: '#fa8c16' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic
              title="Doanh thu thuần"
              value={summary.total_net_revenue ?? 0}
              formatter={(v) => fmt(v)}
              suffix="₫"
              valueStyle={{ fontSize: 16, color: '#52c41a' }}
            />
          </Card>
        </Col>
      </Row>

      <Spin spinning={loading}>
        <Table
          size="small"
          bordered
          dataSource={data}
          columns={columns}
          rowKey="product_code"
          pagination={false}
          summary={summaryRow}
          scroll={{ x: 1050 }}
          style={{ background: '#fff' }}
          locale={{ emptyText: 'Không có dữ liệu' }}
        />
      </Spin>
    </div>
  );
}
