import React from 'react';
import ReactDOM from 'react-dom/client';
import { ListTable } from '@visactor/react-vtable';

const option = {
  columns: [
    {
      field: '0',
      title: 'name'
    },
    {
      field: '1',
      title: 'age'
    },
    {
      field: '2',
      title: 'gender'
    },
    {
      field: '3',
      title: 'hobby'
    }
  ],
  records: new Array(1000).fill(['John', 18, 'male', '🏀'])
};

export default function VTableDemo() {
  return (
    // 表格组件
    <ListTable option={option} height={'500px'} />
  )
}


