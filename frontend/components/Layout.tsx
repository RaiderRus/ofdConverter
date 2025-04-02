import React from 'react';
import dynamic from 'next/dynamic';
import { Tabs } from 'antd';

const BillConverter = dynamic(() => import('./BillConverter'), { ssr: false });
const OFDConverter = dynamic(() => import('./OFDConverter'), { ssr: false });

const Layout: React.FC = () => {
  const items = [
    {
      key: '1',
      label: 'Конвертер ОФД',
      children: <OFDConverter />,
    },
    {
      key: '2',
      label: 'Преобразование электронных счетов',
      children: <BillConverter />,
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Tabs defaultActiveKey="1" items={items} />
    </div>
  );
};

export default Layout; 