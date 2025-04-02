'use client';

import React from 'react';
import dynamic from 'next/dynamic';

const HomePage = dynamic(() => import('../../app/page'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center p-8">
      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
    </div>
  ),
});

const OFDConverter: React.FC = () => {
  return <HomePage />;
};

export default OFDConverter;
