import React from 'react';
import dynamic from 'next/dynamic';
import { Tabs, Layout as AntLayout } from 'antd';

const { Content } = AntLayout;
const BillConverter = dynamic(() => import('./BillConverter'), { ssr: false });
const OFDConverter = dynamic(() => import('./OFDConverter'), { ssr: false });

const AppLayout: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
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
    <AntLayout className="min-h-screen">
      <Content className="p-6">
        <Tabs defaultActiveKey="1" items={items} />
        {children}
      </Content>
    </AntLayout>
  );
};

export default AppLayout;