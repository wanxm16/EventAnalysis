import { useEffect } from 'react';
import useServiceMonitor from '../hooks/useServiceMonitor';

const ServiceMonitor = () => {
  const { cleanup } = useServiceMonitor();

  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return null; // 这是一个隐形组件，不渲染任何内容
};

export default ServiceMonitor;