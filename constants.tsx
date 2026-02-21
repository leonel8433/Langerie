
import React from 'react';

export const COLORS = {
  primary: '#db2777', // pink-600
  secondary: '#fdf2f8', // pink-50
  accent: '#9d174d', // pink-800
  text: '#1f2937', // gray-800
};

export const calculateDiscount = (quantity: number): number => {
  if (quantity >= 5) return 0.15;
  if (quantity >= 3) return 0.10;
  if (quantity === 2) return 0.05;
  return 0;
};

export const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export const STORAGE_KEY = 'LINGERIE_STORE_DATA';
