import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    console.log('Testing questions with exam_code "C"...');
    
    const { data, error } = await supabase
      .from('questions')
      .select('*')
      .eq('exam_code', 'C')
      .limit(10);
    
    if (error) {
      console.error('Questions with C error:', error);
      return Response.json({ 
        error: 'Failed to fetch questions with exam_code C', 
        details: error.message,
        code: error.code
      }, { status: 500 });
    }

    return Response.json({ 
      success: true, 
      questionsWithC: data,
      count: data?.length || 0,
      message: 'Questions with exam_code C test successful'
    });
  } catch (error) {
    console.error('Questions with C test error:', error);
    return Response.json({ 
      error: 'Questions with C test failed', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
