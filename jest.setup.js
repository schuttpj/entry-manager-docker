require('@testing-library/jest-dom');
require('openai/shims/node');

// Mock IndexedDB
const indexedDB = {
  open: jest.fn(),
  deleteDatabase: jest.fn()
};

const IDBKeyRange = {
  bound: jest.fn(),
  lowerBound: jest.fn(),
  upperBound: jest.fn(),
  only: jest.fn()
};

global.indexedDB = indexedDB;
global.IDBKeyRange = IDBKeyRange;

// Mock the window.URL.createObjectURL
window.URL.createObjectURL = jest.fn();

// Mock MediaRecorder
global.MediaRecorder = class {
  constructor() {
    this.state = 'inactive';
    this.ondataavailable = jest.fn();
    this.onstop = jest.fn();
  }
  start() {
    this.state = 'recording';
  }
  stop() {
    this.state = 'inactive';
  }
  pause() {
    this.state = 'paused';
  }
  resume() {
    this.state = 'recording';
  }
};

// Mock getUserMedia
global.navigator.mediaDevices = {
  getUserMedia: jest.fn().mockImplementation(() => Promise.resolve({
    getTracks: () => [{
      stop: jest.fn()
    }]
  }))
}; 