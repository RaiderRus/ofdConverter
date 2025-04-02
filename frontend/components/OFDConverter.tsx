import React from 'react';
import dynamic from 'next/dynamic';

const HomePage = dynamic(() => import('../../app/page'), {
  ssr: false
});

const OFDConverter: React.FC = () => {
  return <HomePage />;
};

export default OFDConverter;
