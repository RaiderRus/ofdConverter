'use client';

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
    <AntLayout className="min-h-screen bg-gray-900">
      <Content className="p-6">
        <div className="max-w-6xl mx-auto">
          <Tabs 
            defaultActiveKey="1" 
            items={items}
            className="text-gray-100"
          />
          {children}
        </div>
      </Content>
    </AntLayout>
  );
};

export default AppLayout;