import { NextResponse } from 'next/server';
import { runComprehensiveTestSuite } from '@/services/store.test';

export async function GET() {
  const result = runComprehensiveTestSuite();
  return NextResponse.json({
    message: 'Sangam Sales Automated Test Suite',
    status: result.failed === 0 ? 'PASSED' : 'FAILED',
    passed: result.passed,
    failed: result.failed,
    failures: result.logs.filter((l) => l.status === 'FAIL'),
    logs: result.logs,
  });
}
