import { useEffect, useState, useCallback } from 'react';
import { Button, Modal, Form, Input, Space, Tree, Popconfirm, Spin, Empty, message } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, PlusSquareOutlined } from '@ant-design/icons';
import PageHeader from '@shared/components/PageHeader';
import { useApi } from '@shared/hooks/useApi';
import { categoriesApi } from '@api/tenant.api';

function buildTreeData(nodes, onAdd, onEdit, onDelete) {
  return nodes.map((node) => ({
    key: node.id,
    title: (
      <Space style={{ width: '100%', justifyContent: 'space-between' }}>
        <span>{node.name}</span>
        <Space size={4}>
          {/* max 3 levels: show +Sub only if depth < 2 */}
          {(!node.parentId || !node.children?.some?.((c) => c.children?.length)) && (
            <Button
              size="small"
              type="text"
              icon={<PlusSquareOutlined />}
              onClick={(e) => { e.stopPropagation(); onAdd(node.id); }}
            >
              +Sub
            </Button>
          )}
          <Button
            size="small"
            type="text"
            icon={<EditOutlined />}
            onClick={(e) => { e.stopPropagation(); onEdit(node); }}
          />
          <Popconfirm
            title="Xoá danh mục này?"
            onConfirm={() => onDelete(node.id)}
            okText="Xoá"
            cancelText="Huỷ"
          >
            <Button
              size="small"
              type="text"
              danger
              icon={<DeleteOutlined />}
              onClick={(e) => e.stopPropagation()}
            />
          </Popconfirm>
        </Space>
      </Space>
    ),
    children: node.children?.length
      ? buildTreeData(node.children, onAdd, onEdit, onDelete)
      : undefined,
  }));
}

export default function Categories() {
  const [tree, setTree] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [parentId, setParentId] = useState(null);
  const [form] = Form.useForm();

  const loadTree = useCallback(() => {
    setLoading(true);
    categoriesApi.tree()
      .then((res) => setTree(res.data?.data ?? res.data ?? []))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadTree(); }, [loadTree]);

  const { execute: createCat, loading: creating } = useApi(categoriesApi.create, {
    successMessage: 'Danh mục đã được tạo',
    onSuccess: () => { setModalOpen(false); form.resetFields(); loadTree(); },
  });

  const { execute: updateCat, loading: updating } = useApi(
    (data) => categoriesApi.update(editing?.id, data),
    {
      successMessage: 'Danh mục đã được cập nhật',
      onSuccess: () => { setModalOpen(false); form.resetFields(); setEditing(null); loadTree(); },
    },
  );

  const { execute: deleteCat } = useApi(categoriesApi.remove, {
    successMessage: 'Đã xoá danh mục',
    onSuccess: loadTree,
  });

  const openAdd = (pid = null) => {
    setEditing(null);
    setParentId(pid);
    form.resetFields();
    setModalOpen(true);
  };

  const openEdit = (node) => {
    setEditing(node);
    setParentId(node.parentId ?? null);
    form.setFieldsValue({ name: node.name, description: node.description });
    setModalOpen(true);
  };

  const handleSubmit = (values) => {
    if (editing) {
      updateCat({ ...values, parentId });
    } else {
      createCat({ ...values, parentId });
    }
  };

  const treeData = buildTreeData(tree, openAdd, openEdit, deleteCat);

  return (
    <div>
      <PageHeader
        title="Danh mục sản phẩm"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => openAdd(null)}>
            Thêm danh mục gốc
          </Button>
        }
      />

      {loading ? (
        <Spin style={{ display: 'block', marginTop: 60 }} />
      ) : tree.length === 0 ? (
        <Empty description="Chưa có danh mục nào" />
      ) : (
        <Tree
          treeData={treeData}
          defaultExpandAll
          blockNode
          selectable={false}
          style={{ background: '#fff', padding: 16, borderRadius: 8 }}
        />
      )}

      <Modal
        title={editing ? 'Chỉnh sửa danh mục' : 'Thêm danh mục'}
        open={modalOpen}
        onCancel={() => { setModalOpen(false); form.resetFields(); setEditing(null); }}
        onOk={() => form.submit()}
        confirmLoading={creating || updating}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="name" label="Tên danh mục" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label="Mô tả">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
