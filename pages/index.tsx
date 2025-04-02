import React from 'react';
import dynamic from 'next/dynamic';

const HomePage = dynamic(() => import('../app/page'), {
  ssr: false
});

export default function Home() {
  return <HomePage />;
}
