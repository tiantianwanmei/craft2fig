/**
 * 💾 useClientStorage - Figma 客户端存储 Hook
 * 支持跨会话状态持久化
 */

import { useCallback, useEffect, useState } from 'react';

interface UseClientStorageOptions<T> {
  key: string;
  defaultValue: T;
}

export function useClientStorage<T>({ key, defaultValue }: UseClientStorageOptions<T>) {
  const [value, setValue] = useState<T>(defaultValue);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 监听存储结果消息
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data?.pluginMessage;
      if (!message) return;

      if (message.type === 'settings-loaded' && message.key === key) {
        setIsLoading(false);
        if (message.data !== undefined && message.data !== null) {
          setValue(message.data as T);
        }
      }

      if (message.type === 'settings-saved' && message.key === key) {
        if (!message.success && message.error) {
          setError(message.error as string);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [key]);

  // 加载初始值
  useEffect(() => {
    parent.postMessage({
      pluginMessage: {
        type: 'request-settings',
        key,
      },
    }, '*');
  }, [key]);

  // 保存值
  const save = useCallback(
    (newValue: T) => {
      setValue(newValue);
      setError(null);
      parent.postMessage({
        pluginMessage: {
          type: 'save-settings',
          key,
          data: newValue,
        },
      }, '*');
    },
    [key]
  );

  // 清除值
  const clear = useCallback(() => {
    setValue(defaultValue);
    setError(null);
    parent.postMessage({
      pluginMessage: {
        type: 'save-settings',
        key,
        data: null,
      },
    }, '*');
  }, [key, defaultValue]);

  return {
    value,
    setValue: save,
    clear,
    isLoading,
    error,
  };
}
