# create-tona 重构计划

## 设计模式选择

### 推荐模式：模板方法模式 (Template Method Pattern)

**选择理由：**

1. **流程固定性**：项目创建流程有明确的步骤骨架：

   * 解析参数 → 获取项目名 → 处理目录 → 选择模板 → 初始化Git → 安装依赖 → 启动服务

2. **步骤可变性**：每个步骤的具体实现可能变化（如不同包管理器的命令），但整体流程不变

3. **代码复用**：将公共流程抽取到基类，避免重复代码

4. **易于扩展**：未来添加新模板或新步骤时，只需扩展子类

### 辅助模式：策略模式 (Strategy Pattern)

用于处理不同包管理器的命令生成逻辑。

***

## 重构目标

1. 将 300+ 行的 `init()` 函数拆分为职责单一的模块
2. 提高代码可测试性和可维护性
3. 消除重复代码
4. 保持功能完全不变

***

## 目录结构设计

```
packages/create-tona/src/
├── index.ts                    # 入口文件
├── types.ts                    # 类型定义
├── consts.ts                   # 常量定义（已存在，需扩展）
├── core/
│   ├── creator.ts              # 项目创建器基类（模板方法）
│   └── context.ts              # 项目上下文
├── prompts/
│   ├── index.ts                # 交互流程编排
│   ├── project-name.ts         # 项目名称交互
│   ├── overwrite.ts            # 目录覆盖交互
│   ├── package-name.ts         # 包名交互
│   ├── language.ts             # 语言选择交互
│   ├── template.ts             # 模板选择交互
│   ├── git.ts                  # Git 初始化交互
│   ├── install.ts              # 安装选项交互
│   └── start.ts                # 启动选项交互
├── actions/
│   ├── scaffold.ts             # 脚手架生成
│   ├── git.ts                  # Git 操作
│   └── package-manager.ts      # 包管理器操作
├── strategies/
│   └── package-manager.ts      # 包管理器策略
└── utils/
    ├── fs.ts                   # 文件系统工具
    ├── package.ts              # 包名处理
    └── command.ts              # 命令执行
```

***

## 实现步骤

### 阶段一：基础设施（类型与常量）

#### 1.1 创建 `types.ts`

* 定义 `CliArgs` 接口

* 定义 `ProjectContext` 接口

* 定义 `PkgInfo` 接口

* 定义 `PackageManager` 类型

* 定义 `Template` 类型

* 定义 `Registry` 类型

#### 1.2 扩展 `consts.ts`

* 添加 `TEMPLATES` 常量

* 添加 `REGISTRIES` 常量

* 添加 `PACKAGE_MANAGERS` 常量

***

### 阶段二：工具函数模块

#### 2.1 创建 `utils/fs.ts`

* 迁移 `formatTargetDir()`

* 迁移 `copy()`

* 迁移 `copyDir()`

* 迁移 `isEmpty()`

* 迁移 `emptyDir()`

#### 2.2 创建 `utils/package.ts`

* 迁移 `isValidPackageName()`

* 迁移 `toValidPackageName()`

* 迁移 `pkgFromUserAgent()`

#### 2.3 创建 `utils/command.ts`

* 迁移 `run()` 函数

***

### 阶段三：策略模式实现

#### 3.1 创建 `strategies/package-manager.ts`

* 定义 `PackageManagerStrategy` 接口

* 实现 `NpmStrategy`

* 实现 `PnpmStrategy`

* 实现 `YarnStrategy`

* 实现 `BunStrategy`

* 实现 `DenoStrategy`

* 创建策略工厂 `getPackageManagerStrategy()`

***

### 阶段四：上下文与核心类

#### 4.1 创建 `core/context.ts`

* 定义 `ProjectContext` 类

* 实现上下文状态管理

#### 4.2 创建 `core/creator.ts`

* 定义 `ProjectCreator` 抽象类

* 实现模板方法 `create()`

* 定义抽象方法：

  * `collectProjectName()`

  * `handleDirectory()`

  * `collectPackageName()`

  * `collectLanguage()`

  * `collectTemplate()`

  * `collectGitOption()`

  * `collectInstallOption()`

  * `collectStartOption()`

* 实现具体方法：

  * `scaffoldProject()`

  * `initializeGit()`

  * `installDependencies()`

  * `startDevServer()`

  * `showCompletionMessage()`

***

### 阶段五：交互模块

#### 5.1 创建 `prompts/index.ts`

* 实现交互流程编排

* 实现 `collectUserInput()` 函数

#### 5.2 创建各交互子模块

* `prompts/project-name.ts` - 项目名称交互

* `prompts/overwrite.ts` - 目录覆盖交互

* `prompts/package-name.ts` - 包名交互

* `prompts/language.ts` - 语言选择交互

* `prompts/template.ts` - 模板选择交互

* `prompts/git.ts` - Git 初始化交互

* `prompts/install.ts` - 安装选项交互

* `prompts/start.ts` - 启动选项交互

***

### 阶段六：操作模块

#### 6.1 创建 `actions/scaffold.ts`

* 实现脚手架生成逻辑

* 封装文件复制和模板处理

#### 6.2 创建 `actions/git.ts`

* 实现 Git 初始化逻辑

* 实现文件暂存逻辑

#### 6.3 创建 `actions/package-manager.ts`

* 实现依赖安装逻辑

* 实现开发服务器启动逻辑

***

### 阶段七：重构入口文件

#### 7.1 重构 `index.ts`

* 导入所有模块

* 实现简化的 `init()` 函数

* 使用模板方法模式调用创建流程

***

## 关键代码示例

### 模板方法模式核心

```typescript
// core/creator.ts
export abstract class ProjectCreator {
  protected context: ProjectContext
  
  constructor(argv: CliArgs) {
    this.context = new ProjectContext(argv)
  }
  
  async create(): Promise<void> {
    await this.collectProjectName()
    await this.handleDirectory()
    await this.collectPackageName()
    await this.collectLanguage()
    await this.collectTemplate()
    await this.collectGitOption()
    await this.collectInstallOption()
    await this.collectStartOption()
    
    await this.scaffoldProject()
    
    if (this.context.initGit) {
      await this.initializeGit()
    }
    
    if (this.context.shouldInstall) {
      await this.installDependencies()
      
      if (this.context.shouldStart) {
        await this.startDevServer()
      }
    }
    
    this.showCompletionMessage()
  }
  
  protected abstract collectProjectName(): Promise<void>
  protected abstract handleDirectory(): Promise<void>
  // ... 其他抽象方法
  
  protected async scaffoldProject(): Promise<void> {
    // 具体实现
  }
}
```

### 策略模式核心

```typescript
// strategies/package-manager.ts
export interface PackageManagerStrategy {
  getInstallCommand(registry?: string): string[]
  getRunCommand(script: string): string[]
}

export class NpmStrategy implements PackageManagerStrategy {
  getInstallCommand(registry?: string): string[] {
    const cmd = ['npm', 'install']
    if (registry) cmd.push('--registry', registry)
    return cmd
  }
  
  getRunCommand(script: string): string[] {
    return ['npm', 'run', script]
  }
}

export class PnpmStrategy implements PackageManagerStrategy {
  getInstallCommand(registry?: string): string[] {
    const cmd = ['pnpm', 'install']
    if (registry) cmd.push('--registry', registry)
    return cmd
  }
  
  getRunCommand(script: string): string[] {
    return ['pnpm', script]
  }
}

// ... 其他策略实现
```

***

## 验证清单

* [ ] 所有原有功能保持不变

* [ ] 命令行参数解析正确

* [ ] 交互式流程正常

* [ ] 非交互式流程正常

* [ ] 文件复制正确

* [ ] Git 初始化正常

* [ ] 依赖安装正常

* [ ] 开发服务器启动正常

* [ ] 错误处理完善

* [ ] 用户取消操作处理正确

***

## 风险与缓解

| 风险           | 缓解措施                  |
| ------------ | --------------------- |
| 重构过程中引入 bug  | 每个阶段完成后进行功能测试         |
| 文件拆分过多导致导入复杂 | 使用桶文件 (index.ts) 统一导出 |
| 模板方法模式增加理解成本 | 添加详细注释和文档             |
| 保持向后兼容       | 确保所有公开 API 不变         |

