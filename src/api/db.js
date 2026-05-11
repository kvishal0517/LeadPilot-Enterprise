// Simplified DB abstraction layer
// In a real app, this would interface with Supabase

const getStoredData = (key) => {
  const data = localStorage.getItem(`leadpilot_${key}`);
  return data ? JSON.parse(data) : [];
};

const setStoredData = (key, data) => {
  localStorage.setItem(`leadpilot_${key}`, JSON.stringify(data));
};

export const entities = {
  Lead: {
    list: async (sort, limit) => {
      let data = getStoredData('leads');
      if (sort === '-created_date') {
        data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      }
      return data.slice(0, limit);
    },
    create: async (payload) => {
      const data = getStoredData('leads');
      const newLead = { ...payload, id: Math.random().toString(36).substr(2, 9), created_at: new Date().toISOString() };
      data.push(newLead);
      setStoredData('leads', data);
      return newLead;
    },
    update: async (id, payload) => {
      const data = getStoredData('leads');
      const index = data.findIndex(l => l.id === id);
      if (index !== -1) {
        data[index] = { ...data[index], ...payload };
        setStoredData('leads', data);
      }
      return data[index];
    },
    delete: async (id) => {
      const data = getStoredData('leads');
      const newData = data.filter(l => l.id !== id);
      setStoredData('leads', newData);
      return { success: true };
    }
  },
  AgentRun: {
    list: async (sort, limit) => {
      let data = getStoredData('runs');
      if (sort === '-created_date') {
        data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      }
      return data.slice(0, limit);
    },
    create: async (payload) => {
      const data = getStoredData('runs');
      const newRun = { ...payload, id: Math.random().toString(36).substr(2, 9), created_at: new Date().toISOString() };
      data.push(newRun);
      setStoredData('runs', data);
      return newRun;
    },
    update: async (id, payload) => {
      const data = getStoredData('runs');
      const index = data.findIndex(r => r.id === id);
      if (index !== -1) {
        data[index] = { ...data[index], ...payload };
        setStoredData('runs', data);
      }
      return data[index];
    },
    delete: async (id) => {
      const data = getStoredData('runs');
      const newData = data.filter(r => r.id !== id);
      setStoredData('runs', newData);
      return { success: true };
    }
  },
  Settings: {
    list: async () => {
      return getStoredData('settings');
    },
    upsert: async (key, value, category, label) => {
      const data = getStoredData('settings');
      const index = data.findIndex(s => s.key === key);
      if (index !== -1) {
        data[index] = { ...data[index], value };
      } else {
        data.push({ key, value, category, label });
      }
      setStoredData('settings', data);
      return data;
    }
  }
};
