import { Input, Empty } from 'antd';
import { useAppStore } from '../../stores/appStore'
export default function ComponentSearch() {
    const { Search } = Input;
    const categories = useAppStore((s) => s.categories)
    const activeCategoryKey = useAppStore((s) => s.activeCategoryKey)

    const activeComponentKey = useAppStore((s) => s.activeComponentKey)

    const currentCategory = categories.find((c) => c.key === activeCategoryKey)
    const components = currentCategory?.children ?? []
    // 组件拖动开始事件
    const handleDragStart = (e: React.DragEvent, item: any) => {
        e.dataTransfer.setData('component-key', item.key)
        e.dataTransfer.effectAllowed = 'copy'
    }
    return (
        <div style={{ height: '100%' }}>
            <Search placeholder="input search text" />
            <div style={{ height: 'calc(100% - 40px)', scrollbarWidth: 'thin', scrollbarColor: 'var(--ant-color-text) transparent', overflowY: 'scroll' }}>
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
            </div>
        </div>
    )
}
