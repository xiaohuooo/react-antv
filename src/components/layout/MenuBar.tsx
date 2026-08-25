import { Menu, App } from 'antd'
import {
  AppstoreOutlined,
  FileOutlined,
  EditOutlined,
  EyeOutlined,
  QuestionCircleOutlined,
} from '@ant-design/icons'
import { useAppStore } from '../../stores/appStore'
import type { MenuProps } from 'antd'

export default function MenuBar() {
  const { message } = App.useApp()
  const addTab = useAppStore((s) => s.addTab)

  const showTip = (msg: string) => {
    message.info(msg, 1.5)
  }

  const fileMenuItems: MenuProps['items'] = [
    { key: 'new', label: '新建', onClick: () => { addTab(); showTip('新建画布') } },
    { key: 'open', label: '打开', onClick: () => showTip('打开文件') },
    { key: 'save', label: '保存', onClick: () => showTip('保存文件') },
    { type: 'divider' },
    { key: 'export', label: '导出PNG', onClick: () => showTip('导出PNG') },
    { key: 'export-svg', label: '导出SVG', onClick: () => showTip('导出SVG') },
    { type: 'divider' },
    { key: 'exit', label: '退出', onClick: () => showTip('退出') },
  ]

  const editMenuItems: MenuProps['items'] = [
    { key: 'undo', label: '撤销 (Ctrl+Z)', onClick: () => showTip('撤销') },
    { key: 'redo', label: '重做 (Ctrl+Y)', onClick: () => showTip('重做') },
    { type: 'divider' },
    { key: 'cut', label: '剪切', onClick: () => showTip('剪切') },
    { key: 'copy', label: '复制 (Ctrl+C)', onClick: () => showTip('复制') },
    { key: 'paste', label: '粘贴 (Ctrl+V)', onClick: () => showTip('粘贴') },
    { type: 'divider' },
    { key: 'delete', label: '删除 (Delete)', onClick: () => showTip('删除') },
    { key: 'select-all', label: '全选 (Ctrl+A)', onClick: () => showTip('全选') },
  ]

  const viewMenuItems: MenuProps['items'] = [
    { key: 'zoom-in', label: '放大', onClick: () => showTip('放大') },
    { key: 'zoom-out', label: '缩小', onClick: () => showTip('缩小') },
    { key: 'zoom-reset', label: '100%视图', onClick: () => showTip('100%视图') },
    { type: 'divider' },
    { key: 'toggle-grid', label: '显示/隐藏网格', onClick: () => showTip('切换网格') },
    { key: 'toggle-ruler', label: '显示/隐藏标尺', onClick: () => showTip('切换标尺') },
  ]

  const helpMenuItems: MenuProps['items'] = [
    { key: 'about', label: '关于', onClick: () => showTip('关于 WebPMC') },
    { key: 'docs', label: '文档', onClick: () => showTip('文档') },
  ]

  return (
    <div className="menu-bar">
      {/* 应用图标 */}
      <AppstoreOutlined style={{ fontSize: 18, marginRight: 8 }} />
      <span style={{ fontWeight: 600, marginRight: 16 }}>WebPMC</span>
      {/* 菜单 */}
      <Menu
        mode="horizontal"
        selectable={false}
        items={[
          { key: 'file', label: '文件', icon: <FileOutlined />, children: fileMenuItems },
          { key: 'edit', label: '编辑', icon: <EditOutlined />, children: editMenuItems },
          { key: 'view', label: '视图', icon: <EyeOutlined />, children: viewMenuItems },
          { key: 'help', label: '帮助', icon: <QuestionCircleOutlined />, children: helpMenuItems },
        ]}
        style={{ flex: 1, borderBottom: 'none', background: 'transparent' }}
      />
    </div>
  )
}
