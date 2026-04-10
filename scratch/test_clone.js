function safeCloneForIDB(obj) {
  if (obj === null || typeof obj !== 'object') {
    return (typeof obj === 'symbol' || typeof obj === 'function') ? undefined : obj;
  }

  if (obj instanceof Date || (obj.getMonth && typeof obj.getMonth === 'function')) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(safeCloneForIDB).filter(v => v !== undefined);
  }

  const result = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const value = obj[key];
      if (typeof value === 'symbol' || typeof value === 'function') {
        console.log('Skipping symbol/function at key:', key);
        continue;
      }
      
      const cleanedValue = safeCloneForIDB(value);
      if (cleanedValue !== undefined) {
        result[key] = cleanedValue;
      }
    }
  }
  return result;
}

const mockRQData = {
  clientState: {
    queries: [
      {
        state: {
          data: [
            { id: '1', name: 'Processo 1', date: new Date() },
            { id: '2', name: 'Processo 2', sym: Symbol('test') }
          ],
          status: 'success'
        },
        queryKey: ['justice-cases']
      }
    ]
  }
};

const sanitized = safeCloneForIDB(mockRQData);
console.log(JSON.stringify(sanitized, null, 2));
