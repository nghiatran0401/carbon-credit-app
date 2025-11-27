'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

interface CLIResult {
  success: boolean;
  command: string;
  result: any;
  timestamp: string;
  error?: string;
}

export default function ImmudbCLIPage() {
  const [command, setCommand] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [history, setHistory] = useState<CLIResult[]>([]);
  const { toast } = useToast();

  const executeCommand = async () => {
    if (!command.trim()) {
      toast({
        title: "Error",
        description: "Please enter a command",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    try {
      // Parse the command
      const parts = command.trim().split(' ');
      const cmd = parts[0].toLowerCase();
      
      let payload: any = { command: cmd };
      
      switch (cmd) {
        case 'get':
          payload.key = parts[1];
          break;
        case 'set':
          payload.key = parts[1];
          payload.value = parts.slice(2).join(' ');
          break;
        case 'scan':
          payload.prefix = parts[1] || '';
          payload.limit = parts[2] ? parseInt(parts[2]) : 100;
          break;
        case 'history':
        case 'verify':
          payload.key = parts[1];
          break;
        case 'count':
          payload.prefix = parts[1] || '';
          break;
      }

      const response = await fetch('/api/immudb/cli', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      
      setHistory(prev => [result, ...prev.slice(0, 19)]); // Keep last 20 commands
      
      if (result.success) {
        toast({
          title: "Command Executed",
          description: result.command,
        });
      } else {
        toast({
          title: "Command Failed",
          description: result.error,
          variant: "destructive",
        });
      }
      
      setCommand('');
      
    } catch (error) {
      toast({
        title: "Execution Error",
        description: `Failed to execute command: ${error}`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      executeCommand();
    }
  };

  const quickCommands = [
    { label: 'Scan all tx_', cmd: 'scan tx_' },
    { label: 'Count all keys', cmd: 'count' },
    { label: 'Count tx_ keys', cmd: 'count tx_' },
    { label: 'Get sample key', cmd: 'get tx_debug_test_1761637733905' },
  ];

  const formatResult = (result: any, command: string) => {
    if (!result) return 'null';
    
    const cmd = command.split(' ')[0].toLowerCase();
    
    switch (cmd) {
      case 'scan':
        if (result.entriesList && Array.isArray(result.entriesList)) {
          return result.entriesList.map((entry: any, index: number) => (
            <div key={index} className="mb-2 p-2 bg-gray-50 rounded">
              <div className="font-mono text-sm"><strong>Key:</strong> {entry.key}</div>
              <div className="font-mono text-xs text-gray-600 break-all">
                <strong>Value:</strong> {typeof entry.value === 'string' ? entry.value : JSON.stringify(entry.value)}
              </div>
              <div className="text-xs text-gray-500"><strong>TX:</strong> {entry.tx}</div>
            </div>
          ));
        }
        break;
        
      case 'get':
        if (result.key && result.value) {
          return (
            <div className="p-2 bg-gray-50 rounded">
              <div className="font-mono text-sm"><strong>Key:</strong> {result.key}</div>
              <div className="font-mono text-xs break-all">
                <strong>Value:</strong> {typeof result.value === 'string' ? result.value : JSON.stringify(result.value)}
              </div>
              <div className="text-xs text-gray-500"><strong>TX:</strong> {result.tx}</div>
            </div>
          );
        }
        break;
        
      case 'history':
        if (result.entriesList && Array.isArray(result.entriesList)) {
          return result.entriesList.map((entry: any, index: number) => (
            <div key={index} className="mb-1 p-2 bg-gray-50 rounded">
              <div className="font-mono text-xs">
                <strong>TX {entry.tx}:</strong> {typeof entry.value === 'string' ? entry.value : JSON.stringify(entry.value)}
              </div>
            </div>
          ));
        }
        break;
        
      case 'count':
        return (
          <div className="p-2 bg-blue-50 rounded">
            <div className="text-lg font-bold">{result.count} keys</div>
            <div className="text-sm text-gray-600">Prefix: {result.prefix}</div>
          </div>
        );
        
      case 'set':
        return (
          <div className="p-2 bg-green-50 rounded">
            <div className="text-sm"><strong>Transaction ID:</strong> {result.id}</div>
            <div className="text-xs text-gray-600"><strong>Timestamp:</strong> {result.ts}</div>
          </div>
        );
    }
    
    return <pre className="text-xs bg-gray-50 p-2 rounded overflow-auto">{JSON.stringify(result, null, 2)}</pre>;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">ImmuDB CLI Interface</h1>
        <Badge variant="outline">Key-Value Commands</Badge>
      </div>

      {/* Command Input */}
      <Card>
        <CardHeader>
          <CardTitle>Execute Commands</CardTitle>
          <CardDescription>
            Enter ImmuDB key-value commands. Available: GET, SET, SCAN, HISTORY, VERIFY, COUNT
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex space-x-2">
            <span className="text-green-600 font-mono">immudb&gt;</span>
            <Input
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Enter command (e.g., scan tx_, get tx_123, count tx_)"
              className="flex-1 font-mono"
              disabled={isLoading}
            />
            <Button onClick={executeCommand} disabled={isLoading || !command.trim()}>
              {isLoading ? 'Executing...' : 'Execute'}
            </Button>
          </div>
          
          {/* Quick Commands */}
          <div>
            <div className="text-sm font-medium mb-2">Quick Commands:</div>
            <div className="flex flex-wrap gap-2">
              {quickCommands.map((qc, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => setCommand(qc.cmd)}
                >
                  {qc.label}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Command Help */}
      <Card>
        <CardHeader>
          <CardTitle>Command Reference</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <div className="font-mono font-bold">GET &lt;key&gt;</div>
              <div className="text-gray-600 mb-2">Retrieve value for a key</div>
              
              <div className="font-mono font-bold">SET &lt;key&gt; &lt;value&gt;</div>
              <div className="text-gray-600 mb-2">Store a key-value pair</div>
              
              <div className="font-mono font-bold">SCAN [prefix] [limit]</div>
              <div className="text-gray-600">Scan keys with optional prefix</div>
            </div>
            <div>
              <div className="font-mono font-bold">HISTORY &lt;key&gt;</div>
              <div className="text-gray-600 mb-2">Get history of a key</div>
              
              <div className="font-mono font-bold">VERIFY &lt;key&gt;</div>
              <div className="text-gray-600 mb-2">Cryptographically verify a key</div>
              
              <div className="font-mono font-bold">COUNT [prefix]</div>
              <div className="text-gray-600">Count keys with optional prefix</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Command History */}
      {history.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Command History</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 max-h-96 overflow-y-auto">
            {history.map((item, index) => (
              <div key={index} className="border rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <div className="font-mono text-sm">
                    <span className="text-green-600">immudb&gt;</span> {item.command}
                  </div>
                  <div className="flex space-x-2">
                    <Badge variant={item.success ? "default" : "destructive"}>
                      {item.success ? "Success" : "Error"}
                    </Badge>
                    <span className="text-xs text-gray-500">{new Date(item.timestamp).toLocaleTimeString()}</span>
                  </div>
                </div>
                
                {item.success ? (
                  <div className="mt-2">
                    {formatResult(item.result, item.command)}
                  </div>
                ) : (
                  <div className="mt-2 p-2 bg-red-50 rounded text-red-700 text-sm">
                    {item.error}
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}