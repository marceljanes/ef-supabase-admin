import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    console.log('Testing exam codes...');
    
    const { data, error } = await supabase
      .from('questions')
      .select('exam_code')
      .order('exam_code', { ascending: true });
    
    if (error) {
      console.error('Exam codes error:', error);
      return Response.json({ 
        error: 'Failed to fetch exam codes', 
        details: error.message,
        code: error.code
      }, { status: 500 });
    }

    // Get unique exam codes
    const allExamCodes = data?.map(item => item.exam_code) || [];
    const uniqueExamCodes = [...new Set(allExamCodes)];
    
    // Count frequency of each exam code
    const examCodeCounts = allExamCodes.reduce((acc, code) => {
      acc[code] = (acc[code] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Response.json({ 
      success: true, 
      uniqueExamCodes,
      examCodeCounts,
      totalQuestions: allExamCodes.length,
      message: 'Exam codes test successful'
    });
  } catch (error) {
    console.error('Exam codes test error:', error);
    return Response.json({ 
      error: 'Exam codes test failed', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
