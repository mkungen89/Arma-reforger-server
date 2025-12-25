import React from 'react';

export default function Skeleton({ height = 12, width = '100%', style = {} }) {
  return (
    <div
      style={{
        height,
        width,
        borderRadius: 8,
        background: 'linear-gradient(90deg, rgba(45,55,72,0.55) 25%, rgba(45,55,72,0.25) 37%, rgba(45,55,72,0.55) 63%)',
        backgroundSize: '400% 100%',
        animation: 'skeletonShimmer 1.2s ease-in-out infinite',
        ...style,
      }}
    />
  );
}


