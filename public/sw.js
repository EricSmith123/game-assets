/**
 * 高级Service Worker缓存策略
 * 提供智能缓存、离线支持、版本控制等功能
 */

const CACHE_VERSION = 'v1.0.0';
const CACHE_NAMES = {
  static: `static-${CACHE_VERSION}`,
  dynamic: `dynamic-${CACHE_VERSION}`,
  api: `api-${CACHE_VERSION}`,
  images: `images-${CACHE_VERSION}`,
  audio: `audio-${CACHE_VERSION}`
};

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico'
];

const CACHE_STRATEGIES = {
  static: 'cache-first',
  dynamic: 'network-first',
  api: 'network-first',
  images: 'cache-first',
  audio: 'cache-first'
};

const CACHE_EXPIRY = {
  static: 7 * 24 * 60 * 60 * 1000, // 7天
  dynamic: 24 * 60 * 60 * 1000, // 1天
  api: 5 * 60 * 1000, // 5分钟
  images: 30 * 24 * 60 * 60 * 1000, // 30天
  audio: 30 * 24 * 60 * 60 * 1000 // 30天
};

// 性能统计
let networkStats = {
  requests: 0,
  cacheHits: 0,
  networkHits: 0,
  errors: 0,
  totalResponseTime: 0
};

/**
 * Service Worker安装事件
 */
self.addEventListener('install', event => {
  console.log('🔧 Service Worker 安装中...');
  
  event.waitUntil(
    Promise.all([
      // 预缓存静态资源
      caches.open(CACHE_NAMES.static).then(cache => {
        console.log('📦 预缓存静态资源...');
        return cache.addAll(STATIC_ASSETS);
      }),
      // 跳过等待，立即激活
      self.skipWaiting()
    ])
  );
});

/**
 * Service Worker激活事件
 */
self.addEventListener('activate', event => {
  console.log('✅ Service Worker 已激活');
  
  event.waitUntil(
    Promise.all([
      // 清理旧缓存
      cleanupOldCaches(),
      // 立即控制所有客户端
      self.clients.claim()
    ])
  );
});

/**
 * 网络请求拦截
 */
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  
  // 跳过非GET请求
  if (request.method !== 'GET') {
    return;
  }
  
  // 跳过chrome-extension等特殊协议
  if (!url.protocol.startsWith('http')) {
    return;
  }
  
  networkStats.requests++;
  
  event.respondWith(
    handleRequest(request)
      .then(response => {
        // 记录响应时间
        const responseTime = Date.now() - event.timeStamp;
        networkStats.totalResponseTime += responseTime;
        
        return response;
      })
      .catch(error => {
        networkStats.errors++;
        console.error('❌ 请求处理失败:', error);
        return createErrorResponse(request);
      })
  );
});

/**
 * 处理网络请求
 */
async function handleRequest(request) {
  const url = new URL(request.url);
  const cacheType = getCacheType(url);
  const strategy = CACHE_STRATEGIES[cacheType];
  
  switch (strategy) {
    case 'cache-first':
      return cacheFirst(request, cacheType);
    case 'network-first':
      return networkFirst(request, cacheType);
    case 'stale-while-revalidate':
      return staleWhileRevalidate(request, cacheType);
    default:
      return fetch(request);
  }
}

/**
 * 缓存优先策略
 */
async function cacheFirst(request, cacheType) {
  const cache = await caches.open(CACHE_NAMES[cacheType]);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    networkStats.cacheHits++;
    
    // 检查缓存是否过期
    if (isCacheExpired(cachedResponse, cacheType)) {
      // 后台更新缓存
      updateCacheInBackground(request, cache);
    }
    
    return cachedResponse;
  }
  
  // 缓存未命中，从网络获取
  try {
    const response = await fetch(request);
    networkStats.networkHits++;
    
    if (response.ok) {
      // 缓存响应
      const responseClone = response.clone();
      await cache.put(request, responseClone);
    }
    
    return response;
  } catch (error) {
    // 网络失败，返回离线页面或默认响应
    return createOfflineResponse(request);
  }
}

/**
 * 网络优先策略
 */
async function networkFirst(request, cacheType) {
  try {
    const response = await fetch(request);
    networkStats.networkHits++;
    
    if (response.ok) {
      // 更新缓存
      const cache = await caches.open(CACHE_NAMES[cacheType]);
      const responseClone = response.clone();
      await cache.put(request, responseClone);
    }
    
    return response;
  } catch (error) {
    // 网络失败，尝试从缓存获取
    const cache = await caches.open(CACHE_NAMES[cacheType]);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      networkStats.cacheHits++;
      return cachedResponse;
    }
    
    throw error;
  }
}

/**
 * 过期重新验证策略
 */
async function staleWhileRevalidate(request, cacheType) {
  const cache = await caches.open(CACHE_NAMES[cacheType]);
  const cachedResponse = await cache.match(request);
  
  // 后台更新缓存
  const fetchPromise = fetch(request).then(response => {
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  });
  
  // 如果有缓存，立即返回
  if (cachedResponse) {
    networkStats.cacheHits++;
    return cachedResponse;
  }
  
  // 没有缓存，等待网络响应
  networkStats.networkHits++;
  return fetchPromise;
}

/**
 * 获取缓存类型
 */
function getCacheType(url) {
  const pathname = url.pathname;
  
  if (pathname.includes('/api/')) {
    return 'api';
  } else if (pathname.includes('/tiles/') || pathname.includes('/images/')) {
    return 'images';
  } else if (pathname.includes('/audio/')) {
    return 'audio';
  } else if (pathname.endsWith('.js') || pathname.endsWith('.css') || pathname.endsWith('.html')) {
    return 'static';
  } else {
    return 'dynamic';
  }
}

/**
 * 检查缓存是否过期
 */
function isCacheExpired(response, cacheType) {
  const dateHeader = response.headers.get('date');
  if (!dateHeader) return false;
  
  const cacheDate = new Date(dateHeader);
  const now = new Date();
  const expiry = CACHE_EXPIRY[cacheType];
  
  return (now.getTime() - cacheDate.getTime()) > expiry;
}

/**
 * 后台更新缓存
 */
async function updateCacheInBackground(request, cache) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      await cache.put(request, response);
    }
  } catch (error) {
    console.warn('⚠️ 后台缓存更新失败:', error);
  }
}

/**
 * 创建离线响应
 */
function createOfflineResponse(request) {
  const url = new URL(request.url);
  
  if (url.pathname.endsWith('.html') || url.pathname === '/') {
    return new Response(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>离线模式</title>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
            .offline { color: #666; }
          </style>
        </head>
        <body>
          <div class="offline">
            <h1>🔌 离线模式</h1>
            <p>网络连接不可用，正在使用缓存内容</p>
            <p>请检查网络连接后刷新页面</p>
          </div>
        </body>
      </html>
    `, {
      status: 200,
      headers: { 'Content-Type': 'text/html' }
    });
  }
  
  return new Response('离线模式', {
    status: 503,
    statusText: 'Service Unavailable'
  });
}

/**
 * 创建错误响应
 */
function createErrorResponse(request) {
  return new Response('请求失败', {
    status: 500,
    statusText: 'Internal Server Error'
  });
}

/**
 * 清理旧缓存
 */
async function cleanupOldCaches() {
  const cacheNames = await caches.keys();
  const currentCaches = Object.values(CACHE_NAMES);
  
  const deletePromises = cacheNames
    .filter(cacheName => !currentCaches.includes(cacheName))
    .map(cacheName => {
      console.log('🗑️ 删除旧缓存:', cacheName);
      return caches.delete(cacheName);
    });
  
  await Promise.all(deletePromises);
}

/**
 * 消息处理
 */
self.addEventListener('message', event => {
  const { type, data } = event.data;
  
  switch (type) {
    case 'GET_STATS':
      event.ports[0].postMessage({
        type: 'STATS_RESPONSE',
        data: {
          ...networkStats,
          averageResponseTime: networkStats.requests > 0 
            ? networkStats.totalResponseTime / networkStats.requests 
            : 0,
          cacheHitRate: networkStats.requests > 0 
            ? (networkStats.cacheHits / networkStats.requests) * 100 
            : 0
        }
      });
      break;
      
    case 'CLEAR_CACHE':
      clearAllCaches().then(() => {
        event.ports[0].postMessage({
          type: 'CACHE_CLEARED',
          data: { success: true }
        });
      });
      break;
      
    case 'UPDATE_CACHE':
      updateCache(data.urls).then(() => {
        event.ports[0].postMessage({
          type: 'CACHE_UPDATED',
          data: { success: true }
        });
      });
      break;
  }
});

/**
 * 清理所有缓存
 */
async function clearAllCaches() {
  const cacheNames = await caches.keys();
  await Promise.all(cacheNames.map(name => caches.delete(name)));
  
  // 重置统计
  networkStats = {
    requests: 0,
    cacheHits: 0,
    networkHits: 0,
    errors: 0,
    totalResponseTime: 0
  };
}

/**
 * 更新指定URL的缓存
 */
async function updateCache(urls) {
  for (const url of urls) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        const cacheType = getCacheType(new URL(url));
        const cache = await caches.open(CACHE_NAMES[cacheType]);
        await cache.put(url, response);
      }
    } catch (error) {
      console.warn('⚠️ 缓存更新失败:', url, error);
    }
  }
}

console.log('🚀 Service Worker 已加载');
