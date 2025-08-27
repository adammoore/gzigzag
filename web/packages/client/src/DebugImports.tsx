import React, { useEffect, useState } from 'react';

// Debug component to test core imports
const DebugCoreImports: React.FC = () => {
  const [importStatus, setImportStatus] = useState<string>('Testing imports...');
  const [coreModule, setCoreModule] = useState<any>(null);

  useEffect(() => {
    const testImports = async () => {
      try {
        console.log('🔍 Testing @zigzag/core imports...');
        
        // Try dynamic import first
        const coreImport = await import('@zigzag/core');
        console.log('✅ Core module imported:', coreImport);
        
        setCoreModule(coreImport);
        
        if (coreImport.createKrebsCycleDemo && typeof coreImport.createBlankSpace === 'function') {
          console.log('✅ Core functions available');
          
          // Test creating demo space
          const demoSpace = coreImport.createKrebsCycleDemo();
          console.log('✅ Demo space created:', demoSpace);
          console.log('   Home cell:', demoSpace.getHomeCell());
          console.log('   Dimensions:', demoSpace.getDimensions());
          console.log('   Cell count:', demoSpace.getCells().length);
          
          setImportStatus('✅ All imports working correctly!');
        } else {
          console.log('❌ Core functions missing');
          setImportStatus('❌ Core functions not found in module');
        }
      } catch (error) {
        console.error('❌ Import failed:', error);
        setImportStatus(`❌ Import failed: ${(error as Error)?.message || error}`);
      }
    };

    testImports();
  }, []);

  return (
    <div style={{ 
      padding: '20px', 
      background: '#1a1a1a', 
      color: '#fff',
      fontFamily: 'monospace',
      minHeight: '100vh'
    }}>
      <h1 style={{ color: '#00ff00' }}>🔧 ZigZag Core Import Debug</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <h3>Import Status:</h3>
        <p style={{ 
          padding: '10px', 
          background: '#2a2a2a', 
          borderRadius: '5px',
          color: importStatus.includes('✅') ? '#00ff00' : '#ff6666'
        }}>
          {importStatus}
        </p>
      </div>

      {coreModule && (
        <div style={{ marginBottom: '20px' }}>
          <h3>Available Exports:</h3>
          <div style={{ padding: '10px', background: '#2a2a2a', borderRadius: '5px' }}>
            <pre>{JSON.stringify(Object.keys(coreModule), null, 2)}</pre>
          </div>
        </div>
      )}

      <div style={{ marginBottom: '20px' }}>
        <h3>Expected Core Functions:</h3>
        <ul>
          <li>createKrebsCycleDemo()</li>
          <li>createBlankSpace()</li>
          <li>ZZCell class</li>
          <li>ZZSpace class</li>
        </ul>
      </div>

      <div style={{ 
        padding: '15px', 
        background: '#2a4a2a', 
        borderRadius: '8px',
        marginTop: '20px'
      }}>
        <h4 style={{ color: '#00ff00' }}>Debug Steps:</h4>
        <ol>
          <li>Check console output (F12 → Console)</li>
          <li>Verify packages/core/src/index.ts exports</li>
          <li>Check if core builds properly: <code>cd packages/core && npm run build</code></li>
          <li>Test core directly: <code>cd packages/core && npm run dev</code></li>
        </ol>
      </div>
    </div>
  );
};

export default DebugCoreImports;
