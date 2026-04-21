import { useState, useCallback } from 'react';
import { message } from 'antd';

export function useApi(apiFn, options = {}) {
  const { onSuccess, onError, successMessage } = options;
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const execute = useCallback(async (...args) => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFn(...args);
      const result = res.data?.data ?? res.data;
      setData(result);
      if (successMessage) message.success(successMessage);
      onSuccess?.(result);
      return result;
    } catch (err) {
      const msg = err.response?.data?.message || 'Something went wrong';
      setError(msg);
      message.error(msg);
      onError?.(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [apiFn, onSuccess, onError, successMessage]);

  return { execute, loading, data, error };
}

export function usePagination(apiFn) {
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0 });
  const { execute, loading, data } = useApi(apiFn);

  const fetch = useCallback((params = {}) => {
    return execute({ ...params, page: pagination.page, limit: pagination.limit }).then((res) => {
      if (res?.total !== undefined) setPagination((p) => ({ ...p, total: res.total }));
    });
  }, [execute, pagination.page, pagination.limit]);

  const onTableChange = ({ current, pageSize }) => {
    setPagination((p) => ({ ...p, page: current, limit: pageSize }));
  };

  return { fetch, loading, data: data?.data || [], pagination, onTableChange };
}
