/**
 * 依赖注入容器
 * 解决模块间循环依赖问题，提升可测试性
 */

import { environmentGuard } from './environmentGuard';
import { Logger } from './logger';

// 服务生命周期类型
export enum ServiceLifetime {
  SINGLETON = 'singleton',
  TRANSIENT = 'transient',
  SCOPED = 'scoped'
}

// 服务描述符接口
export interface ServiceDescriptor<T = any> {
  name: string;
  factory: () => T | Promise<T>;
  lifetime: ServiceLifetime;
  dependencies?: string[];
  instance?: T;
  isInitialized?: boolean;
}

// 依赖注入错误类型
export class DIError extends Error {
  constructor(message: string, public serviceName?: string) {
    super(message);
    this.name = 'DIError';
  }
}

// 循环依赖检测器
class CircularDependencyDetector {
  private visitedServices = new Set<string>();
  private currentPath: string[] = [];

  checkCircularDependency(serviceName: string, dependencies: string[], allServices: Map<string, ServiceDescriptor>): void {
    if (this.currentPath.includes(serviceName)) {
      const cycle = [...this.currentPath, serviceName];
      throw new DIError(`检测到循环依赖: ${cycle.join(' -> ')}`, serviceName);
    }

    if (this.visitedServices.has(serviceName)) {
      return;
    }

    this.currentPath.push(serviceName);
    this.visitedServices.add(serviceName);

    for (const dep of dependencies) {
      const depService = allServices.get(dep);
      if (depService && depService.dependencies) {
        this.checkCircularDependency(dep, depService.dependencies, allServices);
      }
    }

    this.currentPath.pop();
  }

  reset(): void {
    this.visitedServices.clear();
    this.currentPath = [];
  }
}

export class DIContainer {
  private static instance: DIContainer;
  private services = new Map<string, ServiceDescriptor>();
  private scopedInstances = new Map<string, any>();
  private logger: Logger;
  private circularDetector = new CircularDependencyDetector();
  private initializationOrder: string[] = [];

  private constructor() {
    this.logger = Logger.getInstance();
    this.registerCoreServices();
  }

  static getInstance(): DIContainer {
    if (!DIContainer.instance) {
      DIContainer.instance = new DIContainer();
    }
    return DIContainer.instance;
  }

  /**
   * 注册核心服务
   */
  private registerCoreServices(): void {
    // 注册环境检测器
    this.register('environmentGuard', () => environmentGuard, ServiceLifetime.SINGLETON);
    
    // 注册日志系统
    this.register('logger', () => this.logger, ServiceLifetime.SINGLETON);
  }

  /**
   * 注册服务
   */
  register<T>(
    name: string,
    factory: () => T | Promise<T>,
    lifetime: ServiceLifetime = ServiceLifetime.SINGLETON,
    dependencies: string[] = []
  ): void {
    if (this.services.has(name)) {
      this.logger.warn(`服务 ${name} 已存在，将被覆盖`, undefined, 'DIContainer');
    }

    const descriptor: ServiceDescriptor<T> = {
      name,
      factory,
      lifetime,
      dependencies,
      isInitialized: false
    };

    this.services.set(name, descriptor);
    
    environmentGuard.runInDevelopment(() => {
      this.logger.debug(`服务已注册: ${name}`, { lifetime, dependencies }, 'DIContainer');
    });
  }

  /**
   * 注册单例服务
   */
  registerSingleton<T>(name: string, factory: () => T | Promise<T>, dependencies: string[] = []): void {
    this.register(name, factory, ServiceLifetime.SINGLETON, dependencies);
  }

  /**
   * 注册瞬态服务
   */
  registerTransient<T>(name: string, factory: () => T | Promise<T>, dependencies: string[] = []): void {
    this.register(name, factory, ServiceLifetime.TRANSIENT, dependencies);
  }

  /**
   * 注册作用域服务
   */
  registerScoped<T>(name: string, factory: () => T | Promise<T>, dependencies: string[] = []): void {
    this.register(name, factory, ServiceLifetime.SCOPED, dependencies);
  }

  /**
   * 获取服务
   */
  async get<T>(name: string): Promise<T> {
    const descriptor = this.services.get(name);
    if (!descriptor) {
      throw new DIError(`服务未找到: ${name}`, name);
    }

    return this.resolveService<T>(descriptor);
  }

  /**
   * 同步获取服务（仅适用于已初始化的单例服务）
   */
  getSync<T>(name: string): T {
    const descriptor = this.services.get(name);
    if (!descriptor) {
      throw new DIError(`服务未找到: ${name}`, name);
    }

    if (descriptor.lifetime === ServiceLifetime.SINGLETON && descriptor.instance) {
      return descriptor.instance as T;
    }

    throw new DIError(`服务 ${name} 尚未初始化或不是单例服务`, name);
  }

  /**
   * 解析服务
   */
  private async resolveService<T>(descriptor: ServiceDescriptor<T>): Promise<T> {
    switch (descriptor.lifetime) {
      case ServiceLifetime.SINGLETON:
        return this.resolveSingleton(descriptor);
      
      case ServiceLifetime.TRANSIENT:
        return this.resolveTransient(descriptor);
      
      case ServiceLifetime.SCOPED:
        return this.resolveScoped(descriptor);
      
      default:
        throw new DIError(`不支持的服务生命周期: ${descriptor.lifetime}`, descriptor.name);
    }
  }

  /**
   * 解析单例服务
   */
  private async resolveSingleton<T>(descriptor: ServiceDescriptor<T>): Promise<T> {
    if (descriptor.instance) {
      return descriptor.instance;
    }

    // 解析依赖
    await this.resolveDependencies(descriptor);

    // 创建实例
    const instance = await descriptor.factory();
    descriptor.instance = instance;
    descriptor.isInitialized = true;

    this.initializationOrder.push(descriptor.name);

    environmentGuard.runInDevelopment(() => {
      this.logger.debug(`单例服务已创建: ${descriptor.name}`, undefined, 'DIContainer');
    });

    return instance;
  }

  /**
   * 解析瞬态服务
   */
  private async resolveTransient<T>(descriptor: ServiceDescriptor<T>): Promise<T> {
    // 每次都创建新实例
    await this.resolveDependencies(descriptor);
    return await descriptor.factory();
  }

  /**
   * 解析作用域服务
   */
  private async resolveScoped<T>(descriptor: ServiceDescriptor<T>): Promise<T> {
    const existing = this.scopedInstances.get(descriptor.name);
    if (existing) {
      return existing;
    }

    await this.resolveDependencies(descriptor);
    const instance = await descriptor.factory();
    this.scopedInstances.set(descriptor.name, instance);

    return instance;
  }

  /**
   * 解析依赖
   */
  private async resolveDependencies(descriptor: ServiceDescriptor): Promise<void> {
    if (!descriptor.dependencies || descriptor.dependencies.length === 0) {
      return;
    }

    // 检查循环依赖
    this.circularDetector.reset();
    this.circularDetector.checkCircularDependency(descriptor.name, descriptor.dependencies, this.services);

    // 解析所有依赖
    for (const depName of descriptor.dependencies) {
      await this.get(depName);
    }
  }

  /**
   * 检查服务是否已注册
   */
  isRegistered(name: string): boolean {
    return this.services.has(name);
  }

  /**
   * 获取所有已注册的服务名称
   */
  getRegisteredServices(): string[] {
    return Array.from(this.services.keys());
  }

  /**
   * 获取服务信息
   */
  getServiceInfo(name: string): ServiceDescriptor | undefined {
    return this.services.get(name);
  }

  /**
   * 初始化所有单例服务
   */
  async initializeAllSingletons(): Promise<void> {
    const singletonServices = Array.from(this.services.values())
      .filter(service => service.lifetime === ServiceLifetime.SINGLETON);

    this.logger.info(`开始初始化 ${singletonServices.length} 个单例服务`, undefined, 'DIContainer');

    for (const service of singletonServices) {
      try {
        await this.resolveSingleton(service);
      } catch (error) {
        this.logger.error(`单例服务初始化失败: ${service.name}`, error, 'DIContainer');
        throw error;
      }
    }

    this.logger.info(`所有单例服务初始化完成`, { 
      order: this.initializationOrder,
      count: singletonServices.length 
    }, 'DIContainer');
  }

  /**
   * 清理作用域实例
   */
  clearScope(): void {
    this.scopedInstances.clear();
    this.logger.debug('作用域实例已清理', undefined, 'DIContainer');
  }

  /**
   * 获取容器统计信息
   */
  getStats(): {
    totalServices: number;
    singletonServices: number;
    transientServices: number;
    scopedServices: number;
    initializedSingletons: number;
    initializationOrder: string[];
  } {
    const services = Array.from(this.services.values());
    
    return {
      totalServices: services.length,
      singletonServices: services.filter(s => s.lifetime === ServiceLifetime.SINGLETON).length,
      transientServices: services.filter(s => s.lifetime === ServiceLifetime.TRANSIENT).length,
      scopedServices: services.filter(s => s.lifetime === ServiceLifetime.SCOPED).length,
      initializedSingletons: services.filter(s => s.lifetime === ServiceLifetime.SINGLETON && s.isInitialized).length,
      initializationOrder: [...this.initializationOrder]
    };
  }

  /**
   * 销毁容器
   */
  dispose(): void {
    this.services.clear();
    this.scopedInstances.clear();
    this.initializationOrder = [];
    this.circularDetector.reset();
    
    this.logger.info('依赖注入容器已销毁', undefined, 'DIContainer');
  }
}

// 创建全局实例
export const diContainer = DIContainer.getInstance();

// 在开发环境中挂载到全局
environmentGuard.runInDevelopment(() => {
  (window as any).diContainer = diContainer;
  console.log('🔧 依赖注入容器已挂载到 window.diContainer');
});
