import { Tree, Tabs } from 'antd'
import { useAppStore } from '../../stores/appStore'
import { useState } from 'react'
import ComponentSplitter from './ComponentSplitter'
import ComponentSearch from './ComponentSearch'

export default function LeftPanel() {
  const defaultTree = useAppStore((s) => s.defaultTree)
  // 左边大类
  const [treeKey, setTreeKey] = useState('1')

  const treeData2 = [
    {
      title: '项目根目录',
      key: 'root',
      children: [
        {
          title: '源代码',
          key: 'src',
          children: [
            { title: '入口文件.tsx', key: 'entry' },
            { title: '组件文件夹', key: 'components' },
          ],
        },
        {
          title: '资源文件',
          key: 'assets',
          children: [
            { title: '样式表.css', key: 'css' },
            { title: '图片资源', key: 'images' },
          ],
        },
        { title: '配置项.json', key: 'config' },
      ],
    },
  ]

  return (
    <div className="left-panel">
      {/* 组件分类 */}
      <div className="left-panel-categories">
        {defaultTree.map((cat) => (
          <div
            key={cat.key}
            className={`left-panel-category-item ${treeKey === cat.key ? 'active' : ''}`}
            onClick={() => (setTreeKey(cat.key))}
          >
            <span style={{ fontSize: 18 }}>{cat.icon}</span>
            <span>{cat.title}</span>
          </div>
        ))}
      </div>

      <div className="left-panel-tree-area">
        {treeKey === '1' &&
          <Tabs
            tabPlacement="top"
            style={{height: '100%' }}
            items={[
              {
                key: 'props',
                label: '组件',
                children: <ComponentSplitter />
              },
              {
                key: 'other',
                label: '搜索',
                children: <ComponentSearch />
              },
            ]}
          />
        }

        {treeKey === '2' && <Tree
          treeData={treeData2}
          showLine={false}
          defaultExpandAll={true}
          blockNode
          styles={{
            root: {
              height: "100%",
              overflowY: "auto",
            },
          }}
        />}
      </div>
    </div>
  )
}
