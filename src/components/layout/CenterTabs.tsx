import { Tabs, App } from 'antd'
import { useAppStore } from '../../stores/appStore'
import CanvasTab from '../canvas/CanvasTab'

export default function CenterTabs() {
  const { message } = App.useApp()
  const tabs = useAppStore((s) => s.tabs)
  const activeTabId = useAppStore((s) => s.activeTabId)
  const setActiveTab = useAppStore((s) => s.setActiveTab)
  const removeTab = useAppStore((s) => s.removeTab)
  const addTab = useAppStore((s) => s.addTab)

  const handleTabEdit = (targetKey: any, action: 'add' | 'remove') => {
    if (action === 'add') {
      if (tabs.length >= 10) {
        message.warning('最多只能打开10个画布页')
        return
      }
      addTab()
    } else if (action === 'remove') {
      if (tabs.length <= 1) {
        message.warning('至少保留一个画布页')
        return
      }
      removeTab(targetKey)
    }
  }

  const tabItems = tabs.map((tab) => ({
    key: tab.id,
    label: tab.title,
    children: <CanvasTab tabId={tab.id} />,
    closable: tabs.length > 1,
  }))

  return (
    <div className="center-tabs">
      {/* 画布页标签 */}
      <Tabs
        type="editable-card"
        activeKey={activeTabId}
        onChange={setActiveTab}
        onEdit={handleTabEdit}
        hideAdd={tabs.length >= 10}
        items={tabItems}
        destroyOnHidden
        style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
      />
    </div>
  )
}
