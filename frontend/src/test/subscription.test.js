// 事件订阅功能测试
// 这个文件演示了订阅功能的主要逻辑

// 模拟 localStorage 
const mockLocalStorage = {
  data: {},
  getItem: function(key) {
    return this.data[key] || null;
  },
  setItem: function(key, value) {
    this.data[key] = value;
  },
  removeItem: function(key) {
    delete this.data[key];
  }
};

// 模拟筛选条件
const mockColumnFilters = {
  search: '纠纷',
  town: '白云街道', 
  level: '二级事件',
  category: '矛盾纠纷'
};

// 获取筛选标签的函数（从 EventList.js 复制）
function getFilterTags(columnFilters) {
  const tags = [];
  
  // 搜索文本
  if (columnFilters.search) {
    tags.push({
      key: 'search',
      label: '关键词',
      value: columnFilters.search,
      color: 'blue'
    });
  }
  
  // 镇街名称
  if (columnFilters.town) {
    tags.push({
      key: 'town',
      label: '镇街',
      value: columnFilters.town,
      color: 'green'
    });
  }
  
  // 事件级别
  if (columnFilters.level) {
    tags.push({
      key: 'level',
      label: '级别',
      value: columnFilters.level,
      color: 'orange'
    });
  }
  
  // 二级分类
  if (columnFilters.category) {
    tags.push({
      key: 'category',
      label: '分类',
      value: columnFilters.category,
      color: 'purple'
    });
  }
  
  return tags;
}

// 创建订阅的函数
function createSubscription(name, description, columnFilters, searchParams) {
  const filterTags = getFilterTags(columnFilters);
  
  if (filterTags.length === 0) {
    throw new Error('请先设置筛选条件');
  }
  
  const newSubscription = {
    id: Date.now().toString(),
    name: name,
    description: description || '无描述',
    filters: columnFilters,
    searchParams: searchParams,
    tags: filterTags,
    createTime: new Date().toLocaleString('zh-CN'),
    enabled: true
  };
  
  // 保存到本地存储
  const existingSubscriptions = JSON.parse(mockLocalStorage.getItem('event_subscriptions') || '[]');
  const updatedSubscriptions = [...existingSubscriptions, newSubscription];
  mockLocalStorage.setItem('event_subscriptions', JSON.stringify(updatedSubscriptions));
  
  return newSubscription;
}

// 测试函数
function testSubscriptionFeature() {
  console.log('🧪 开始测试事件订阅功能...\n');
  
  // 测试1: 获取筛选标签
  console.log('📋 测试1: 获取筛选标签');
  const tags = getFilterTags(mockColumnFilters);
  console.log('筛选标签:', tags);
  console.log('标签数量:', tags.length);
  console.log('');
  
  // 测试2: 创建订阅
  console.log('➕ 测试2: 创建订阅');
  try {
    const subscription = createSubscription(
      '白云街道纠纷事件监控',
      '监控白云街道的矛盾纠纷事件',
      mockColumnFilters,
      { search: '纠纷', town: '白云街道' }
    );
    console.log('✅ 订阅创建成功:', subscription.name);
    console.log('订阅ID:', subscription.id);
    console.log('创建时间:', subscription.createTime);
    console.log('');
  } catch (error) {
    console.log('❌ 订阅创建失败:', error.message);
  }
  
  // 测试3: 查看保存的订阅
  console.log('📄 测试3: 查看保存的订阅');
  const savedSubscriptions = JSON.parse(mockLocalStorage.getItem('event_subscriptions') || '[]');
  console.log('已保存订阅数量:', savedSubscriptions.length);
  savedSubscriptions.forEach((sub, index) => {
    console.log(`订阅${index + 1}: ${sub.name}`);
    console.log(`- 描述: ${sub.description}`);
    console.log(`- 标签: ${sub.tags.map(tag => `${tag.label}:${tag.value}`).join(', ')}`);
    console.log('');
  });
  
  // 测试4: 测试空筛选条件
  console.log('🚫 测试4: 测试空筛选条件');
  try {
    createSubscription('空订阅', '测试空筛选条件', {}, {});
  } catch (error) {
    console.log('✅ 正确捕获错误:', error.message);
  }
  
  console.log('🎉 订阅功能测试完成！');
}

// 运行测试
if (typeof module !== 'undefined' && module.exports) {
  // Node.js 环境
  module.exports = {
    getFilterTags,
    createSubscription,
    testSubscriptionFeature
  };
} else {
  // 浏览器环境
  window.testSubscriptionFeature = testSubscriptionFeature;
  
  // 自动运行测试
  testSubscriptionFeature();
}