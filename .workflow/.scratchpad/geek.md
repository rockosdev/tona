# Geek 主题 - 园龄/粉丝/关注数据错位修复

## Bug 描述

Geek 主题个人资料区域显示园龄、粉丝、关注数据时出现错位，例如：

```
园龄：（空）
粉丝：6年3个月
关注：3
```

粉丝字段显示了园龄的值，关注字段显示了粉丝的值。

## 根因分析

### 第一层：博客园 `#profile_block` 结构变更

博客园在 `#profile_block` 中新增了**荣誉**字段，多了一个 `<a>` 标签：

```html
<div id="profile_block">
    昵称：<a href="...">UserName</a><br>
    园龄：<a href="...">6年3个月</a><br>
    荣誉：<a href="...">推荐博客</a><br>   <!-- 新增字段 -->
    粉丝：<a href="...">42</a><br>
    关注：<a href="...">3</a>
</div>
```

### 第二层：原始代码的两个问题

**问题 1** — 原始正则匹配（`themes/geek/src/utils/cnblog.js`）

jQuery `.text()` 不会将 `<br>` 转为换行符，文本被拼接为无空格无换行的连续字符串：

```
昵称：Username园龄：6年3个月荣誉：推荐博客粉丝：42关注：3
```

`getBlogAge()` 的正则 `[^ \n]+` 贪婪匹配到末尾，捕获了 `6年3个月荣誉：推荐博客粉丝：42关注：3`。

**问题 2** — `nth-of-type` 选择器偏移

`packages/utils`、`packages/plugins`、`themes/reacg` 使用 `a:nth-of-type(N)` 按索引取值：
- `a:nth-of-type(2)` = 园龄
- `a:nth-of-type(3)` = 粉丝
- `a:nth-of-type(4)` = 关注

但荣誉字段新增了 `<a>` 标签后，索引全部偏移一位：
- `a:nth-of-type(2)` = 园龄（不变）
- `a:nth-of-type(3)` = **荣誉**（原为粉丝）
- `a:nth-of-type(4)` = **粉丝**（原为关注）

因此首次修复（改用 `nth-of-type`）也不可靠。

### 最终方案：基于标签文本的 HTML 匹配

不依赖 `<a>` 元素的数量和顺序，直接用正则匹配 HTML 中 `标签：<a>值</a>` 的结构：

```js
// 匹配 "园龄：<a ...>6年3个月</a>" 中的值
new RegExp(`${label}[：:]\\s*<[^>]*>([^<]+)`)
```

无论博客园新增或删除什么字段，只要标签文本（园龄/粉丝/关注）不变就能正确提取。

## 修复内容

**文件**: `themes/geek/src/utils/cnblog.js`

### 修复前

```js
// 原始代码 — 正则匹配 .text()，贪婪匹配过度
export function getBlogAge() {
  if (!openNews()) return '未知'
  const text = $('#profile_block').text()
  const match = text.match(/园龄：\s*([^ \n]+)/)  // 捕获到字符串末尾
  return match ? match[1].trim() : '未知'
}

export function getFollowers() {
  if (!openNews()) return '0'
  const text = $('#profile_block').text()
  const match = text.match(/粉丝：\s*([0-9]+)/)
  return match ? match[1].trim() : '0'
}

export function getFollowing() {
  if (!openNews()) return '0'
  const text = $('#profile_block').text()
  const match = text.match(/关注：\s*([0-9]+)/)
  return match ? match[1].trim() : '0'
}
```

### 修复后

```js
// 新增通用提取函数 — 基于 HTML 标签文本匹配，不依赖元素顺序
function getProfileValue(label) {
  const html = $('#profile_block').html()
  if (!html) return ''
  const regex = new RegExp(`${label}[：:]\\s*<[^>]*>([^<]+)`)
  const match = html.match(regex)
  return match ? match[1].trim() : ''
}

export function getFollowers() {
  return openNews() ? getProfileValue('粉丝') || '0' : '0'
}

export function getFollowing() {
  return openNews() ? getProfileValue('关注') || '0' : '0'
}

export function getBlogAge() {
  return openNews() ? getProfileValue('园龄') || '未知' : '未知'
}
```

### 对比

| 项目         | 原始方案 (正则 .text()) | 第一次修复 (nth-of-type)  | 最终方案 (正则 .html()) |
| ------------ | ----------------------- | ------------------------- | ----------------------- |
| 依赖 `.text()` 拼接 | 是，贪婪匹配问题 | 否 | 否 |
| 依赖 `<a>` 顺序 | 否 | 是，荣誉字段导致偏移 | 否 |
| 新增字段影响 | 会捕获多余内容 | 索引全部偏移 | 无影响 |
| 健壮性       | 低                      | 低                        | 高                      |

## 构建与部署

### 1. 安装 pnpm

```bash
sudo npm install -g pnpm
# 或
curl -fsSL https://get.pnpm.io/install.sh | sh -
```

### 2. 构建主题

```bash
cd ~/Workspaces/tona

# 安装依赖
pnpm install

# 构建所有主题
pnpm build:theme
```

输出文件: `themes/geek/dist/geek.js`

### 3. 上传到博客园

1. 登录博客园 → 管理 → 文件
2. 上传 `geek.js`
3. 点击该文件的**分享链接**，复制得到的 URL
4. 将 URL 填入 `<script>` 标签

```html
<script>
  window.opts = {
    theme: {
      avatar: 'https://pic.cnblogs.com/avatar/你的ID/xxx.png',
    },
    signature: {
      enable: true,
      contents: [
        "This theme is from <b style='color:#ff6b81'>Cnblog Labs</b>. 🔬",
        'Welcome to use! 🙌',
        "<b>console.log('🍁');</b>",
      ],
    },
  }
</script>
<script src="这里粘贴文件的分享链接"></script>
```
