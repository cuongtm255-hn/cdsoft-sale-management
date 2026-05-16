import { useEffect, useState, useCallback } from 'react';
import { Button, Modal, Form, Input, Space, Tree, Popconfirm, Spin, Empty, message } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, PlusSquareOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import PageHeader from '@shared/components/PageHeader';
import { useApi } from '@shared/hooks/useApi';
import { categoriesApi } from '@api/tenant.api';

function buildTreeData(nodes, onAdd, onEdit, onDelete, t) {
  return nodes.map((node) => ({
    key: node.id,
    title: (
      <Space style={{ width: '100%', justifyContent: 'space-between' }}>
        <span>{node.name}</span>
        <Space size={4}>
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
            title={t('categories.confirmDelete')}
            onConfirm={() => onDelete(node.id)}
            okText={t('common.delete')}
            cancelText={t('common.cancel')}
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
      ? buildTreeData(node.children, onAdd, onEdit, onDelete, t)
      : undefined,
  }));
}

export default function Categories() {
  const { t } = useTranslation();
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
    successMessage: t('categories.created'),
    onSuccess: () => { setModalOpen(false); form.resetFields(); loadTree(); },
  });

  const { execute: updateCat, loading: updating } = useApi(
    (data) => categoriesApi.update(editing?.id, data),
    {
      successMessage: t('categories.updated'),
      onSuccess: () => { setModalOpen(false); form.resetFields(); setEditing(null); loadTree(); },
    },
  );

  const { execute: deleteCat } = useApi(categoriesApi.remove, {
    successMessage: t('categories.deleted'),
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

  const treeData = buildTreeData(tree, openAdd, openEdit, deleteCat, t);

  return (
    <div>
      <PageHeader
        title={t('categories.title')}
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => openAdd(null)}>
            {t('categories.addRoot')}
          </Button>
        }
      />

      {loading ? (
        <Spin style={{ display: 'block', marginTop: 60 }} />
      ) : tree.length === 0 ? (
        <Empty description={t('categories.empty')} />
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
        title={editing ? t('categories.editTitle') : t('categories.addTitle')}
        open={modalOpen}
        onCancel={() => { setModalOpen(false); form.resetFields(); setEditing(null); }}
        onOk={() => form.submit()}
        confirmLoading={creating || updating}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="name" label={t('categories.name')} rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label={t('categories.description')}>
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
