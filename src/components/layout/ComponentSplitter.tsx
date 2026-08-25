import { Tree, Empty, Splitter } from 'antd'
import type { TreeProps } from 'antd'
import { useAppStore } from '../../stores/appStore'

/**
 * 组件分类 + 组件列表 分栏面板
 * 上方为组件分类树，下方为当前分类下的组件网格
 */
export default function ComponentSplitter() {
  const categories = useAppStore((s) => s.categories)
  const activeCategoryKey = useAppStore((s) => s.activeCategoryKey)
  const setActiveCategory = useAppStore((s) => s.setActiveCategory)
  const activeComponentKey = useAppStore((s) => s.activeComponentKey)

  const currentCategory = categories.find((c) => c.key === activeCategoryKey)
  const components = currentCategory?.children ?? []

  // 分类树数据
  const treeData = categories.map((cat) => ({
    key: cat.key,
    title: (
      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span>{cat.icon}</span>
        <span>{cat.title}</span>
      </span>
    ),
  }))

  // 树节点选择事件
  const onSelect: TreeProps['onSelect'] = (selectedKeys: any) => {
    if (selectedKeys.length > 0) {
      setActiveCategory(selectedKeys[0] as string)
    }
  }

  // 组件拖动开始事件
  const handleDragStart = (e: React.DragEvent, item: any) => {
    e.dataTransfer.setData('component-key', item.key)
    e.dataTransfer.effectAllowed = 'copy'
  }

  return (
    <Splitter vertical>
      <Splitter.Panel defaultSize="22%">
        {/* 组件分类树 */}
        <Tree
          treeData={treeData}
          selectedKeys={[activeCategoryKey]}
          onSelect={onSelect}
          showLine={false}
          blockNode
          styles={{
            root: {
              height: '100%',
              overflowY: 'auto',
              scrollbarWidth: 'thin',
              scrollbarColor: 'var(--ant-color-text) transparent',
            },
          }}
        />
      </Splitter.Panel>
      <Splitter.Panel
        defaultSize="78%"
        style={{ scrollbarWidth: 'thin', scrollbarColor: 'var(--ant-color-text) transparent' }}
      >
        {/* 组件列表 */}
        <div className="left-panel-components">
          {components.length === 0 ? (
            <Empty description="暂无组件" />
          ) : (
            <div className="left-panel-component-grid">
              {components.map((comp) => (
                <div
                  key={comp.key}
                  className={`left-panel-component-item`}
                  draggable
                  onDragStart={(e) => handleDragStart(e, comp)}
                  title={`拖动${comp.label}到画布`}
                  style={
                    activeComponentKey === comp.key
                      ? { background: 'rgba(22,119,255,0.1)', borderColor: '#1677ff' }
                      : {}
                  }
                >
                  <span className="component-icon">{comp.icon}</span>
                  <span>{comp.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </Splitter.Panel>
    </Splitter>
  )
}
