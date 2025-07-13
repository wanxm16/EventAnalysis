import { useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { message } from 'antd';

const useServiceMonitor = () => {
  const { logout, isAuthenticated } = useAuth();
  const intervalRef = useRef(null);
  const isCheckingRef = useRef(false);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    // 暂时禁用服务监控，避免与AI聊天请求冲突
    console.log('服务监控已禁用，避免与AI请求冲突');
    return;

    const checkServiceHealth = async () => {
      if (isCheckingRef.current) return;
      isCheckingRef.current = true;

      try {
        // 检查后端服务状态
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const response = await fetch('/api/health', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error('Service unavailable');
        }

        const data = await response.json();
        
        // 检查服务是否正在停止
        if (data.status === 'stopping' || !data.service_active) {
          console.warn('检测到服务正在停止...');
          message.warning('检测到服务正在停止，正在自动退出登录...');
          logout();
          
          // 清理定时器
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
        }
      } catch (error) {
        console.warn('服务健康检查失败:', error);
        
        // 只有在真正的网络错误时才退出登录，忽略信号中止错误
        if (error.name === 'AbortError') {
          console.log('健康检查超时，但这可能是正常的');
          return;
        }
        
        // 检查是否是网络连接问题
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
          console.warn('网络连接失败，可能服务已停止');
          message.warning('检测到服务已停止，正在自动退出登录...');
          logout();
        }
        
        // 清理定时器
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      } finally {
        isCheckingRef.current = false;
      }
    };

    // 开始监听服务状态
    intervalRef.current = setInterval(checkServiceHealth, 10000); // 每10秒检查一次，减少干扰

    // 页面隐藏/显示时的处理
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isAuthenticated) {
        // 页面重新可见时立即检查一次
        checkServiceHealth();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // 窗口关闭前的处理
    const handleBeforeUnload = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };

    // 监听页面刷新或关闭事件
    const handleUnload = () => {
      // 清理认证状态（可选，因为用户可能只是刷新页面）
      // logout();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('unload', handleUnload);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('unload', handleUnload);
    };
  }, [isAuthenticated, logout]);

  // 手动清理函数
  const cleanup = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  return { cleanup };
};

export default useServiceMonitor;