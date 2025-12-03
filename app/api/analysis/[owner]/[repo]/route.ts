import { GPT_MODEL_NAME } from '@/lib/constants/openai';
import { openai } from '@/lib/openai';
import { prisma } from '@/lib/prisma';
import { createClient as createSupabaseClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ owner: string; repo: string }> },
) {
  try {
    const { owner, repo } = await params;
    const fullName = `${owner}/${repo}`;

    // 1. 인증된 사용자 확인
    const supabase = await createSupabaseClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: '로그인이 필요합니다' },
        { status: 401 },
      );
    }
    console.log(`[Analysis API] Authenticated Supabase user.id: ${user.id}`);

    // 2. Prisma User 찾기
    const githubUserId = user.user_metadata?.provider_id;
    if (!githubUserId) {
      return NextResponse.json(
        { error: 'GitHub 사용자 정보를 찾을 수 없습니다' },
        { status: 400 },
      );
    }

    const dbUser = await prisma.user.findUnique({
      where: { githubId: parseInt(githubUserId) },
    });

    if (!dbUser) {
      console.log(
        `[Analysis API] Prisma User not found for githubId: ${githubUserId}`,
      );
      return NextResponse.json(
        {
          error:
            '사용자 정보를 찾을 수 없습니다. 먼저 Repository에 접속해주세요.',
        },
        { status: 404 },
      );
    }
    console.log(`[Analysis API] Prisma User found: ${dbUser.id}`);

    console.log(
      `[Analysis API] Request for fullName: ${fullName}, Prisma userId: ${dbUser.id}`,
    );

    // 3. DB에서 Repository 찾기
    const dbRepository = await prisma.repository.findFirst({
      where: {
        fullName: fullName,
        userId: dbUser.id, // Prisma User의 id 사용
      },
    });

    if (!dbRepository) {
      console.log(
        `[Analysis API] Repository not found for fullName: ${fullName}, Prisma userId: ${dbUser.id}`,
      );
      return NextResponse.json(
        {
          error:
            'Repository를 찾을 수 없습니다. 먼저 Repository 상세 페이지에 접속해주세요.',
        },
        { status: 404 },
      );
    }
    console.log(
      `[Analysis API] Repository found: ${dbRepository.id}, name: ${dbRepository.name}`,
    );

    // 4. DB에서 모든 Commit 목록 조회
    const dbCommits = await prisma.commit.findMany({
      where: {
        repositoryId: dbRepository.id,
      },
      orderBy: {
        authorDate: 'asc', // 오래된 순으로 정렬
      },
      // OpenAI API 호출량을 줄이기 위해 최근 200개 커밋만 분석
      take: 200,
    });

    // 5. Merge 커밋 제외 및 OpenAI 프롬프트용 데이터 준비
    const commitMessages = dbCommits
      .filter((commit) => !commit.message.startsWith('Merge pull request'))
      .map((commit) => ({
        sha: commit.sha,
        message: commit.message.split('\n')[0], // 첫 줄만 사용
      }));

    if (commitMessages.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        groupedFeatures: [],
        count: 0,
      });
    }

    // 6. OpenAI를 사용하여 커밋 그룹화
    const prompt = `
    You are a software development analyst. Your task is to analyze commit messages and group them into MULTIPLE distinct features.

    CRITICAL REQUIREMENTS:
    1. You MUST create at least 3 separate groups (preferably more)
    2. DO NOT group all commits into a single feature - this is WRONG
    3. Look for different types of work: new features, bug fixes, refactoring, UI changes, documentation, testing
    4. Even similar commits should be split if they serve different purposes
    5. If you see only one logical grouping, split it into sub-features

    GROUPING STRATEGY:
    - New features → separate groups
    - Bug fixes → separate from features
    - Refactoring → separate from functional changes
    - UI/styling changes → can be separate from logic
    - Initial setup commits → group separately
    - Documentation updates → separate group
    - Test additions → can be separate

    Commit messages to analyze:
    ${JSON.stringify(commitMessages, null, 2)}

    REQUIRED OUTPUT FORMAT (JSON array with 3+ groups):
    [
      {
        "featureName": "Initialize project setup",
        "commits": ["sha1", "sha2"]
      },
      {
        "featureName": "Implement user authentication",
        "commits": ["sha3", "sha4"]
      },
      {
        "featureName": "Add dashboard UI components",
        "commits": ["sha5", "sha6"]
      },
      {
        "featureName": "Fix authentication bugs",
        "commits": ["sha7"]
      }
    ]

    REMEMBER: Return a JSON array with at least 3 groups. Analyze carefully and separate different types of work.
    `;

    const chatCompletion = await openai.chat.completions.create({
      model: GPT_MODEL_NAME,
      messages: [
        {
          role: 'system',
          content:
            'You are an expert software development analyst. Your specialty is identifying distinct features and work streams from commit histories. You ALWAYS create multiple groups (at least 3), never grouping everything into a single feature. You excel at separating different types of work: features, fixes, refactoring, and setup.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3, // 낮은 temperature로 더 일관성 있는 결과
    });

    const openaiResponseContent = chatCompletion.choices[0].message.content;
    if (!openaiResponseContent) {
      throw new Error('OpenAI API 응답이 비어 있습니다.');
    }

    console.log('[Analysis API] OpenAI Raw Response:', openaiResponseContent);

    let groupedFeaturesData: { featureName: string; commits: string[] }[] = [];
    try {
      const parsedResponse = JSON.parse(openaiResponseContent);
      console.log(
        '[Analysis API] Parsed Response:',
        JSON.stringify(parsedResponse, null, 2),
      );

      // OpenAI 응답 형식 처리
      if (Array.isArray(parsedResponse)) {
        // 배열로 직접 반환
        groupedFeaturesData = parsedResponse;
      } else if (
        parsedResponse.features &&
        Array.isArray(parsedResponse.features)
      ) {
        // {"features": [...]} 형식
        groupedFeaturesData = parsedResponse.features;
      } else if (
        parsedResponse.featureName &&
        Array.isArray(parsedResponse.commits)
      ) {
        // 단일 feature 객체 형식 - 배열로 감싸기
        console.log(
          '[Analysis API] Single feature object detected, wrapping in array',
        );
        groupedFeaturesData = [parsedResponse];
      } else {
        // 다른 키를 시도해봄
        const possibleKeys = Object.keys(parsedResponse);
        console.log('[Analysis API] Available keys in response:', possibleKeys);

        for (const key of possibleKeys) {
          const value = parsedResponse[key];
          if (Array.isArray(value) && value.length > 0) {
            // 배열의 첫 요소가 feature 객체인지 확인
            if (
              typeof value[0] === 'object' &&
              'featureName' in value[0] &&
              'commits' in value[0]
            ) {
              console.log(`[Analysis API] Found feature array at key: ${key}`);
              groupedFeaturesData = value;
              break;
            }
          }
        }

        if (groupedFeaturesData.length === 0) {
          throw new Error(
            `OpenAI API 응답 형식이 예상과 다릅니다. 응답: ${JSON.stringify(parsedResponse)}`,
          );
        }
      }

      console.log(
        '[Analysis API] Final groupedFeaturesData:',
        groupedFeaturesData,
      );
    } catch (parseError) {
      console.error('OpenAI 응답 파싱 에러:', parseError);
      throw new Error('OpenAI API 응답을 파싱하는 데 실패했습니다.');
    }

    // 7. 그룹화된 커밋에 원래 커밋 객체 연결 및 시간 계산 (세션 기반)
    const SESSION_GAP_HOURS = 3; // 3시간 이상 간격이 벌어지면 다른 세션으로 간주

    const featuresWithCommits = groupedFeaturesData.map((feature) => {
      const commitsInFeature = feature.commits
        .map((sha) => dbCommits.find((commit) => commit.sha === sha))
        .filter(
          (commit): commit is (typeof dbCommits)[0] => commit !== undefined,
        ); // undefined 필터링 및 타입 가드

      let timeSpentSeconds = 0;
      let timeSpentHours = 0;
      let totalElapsedHours = 0;

      if (commitsInFeature.length > 0) {
        // 시간순으로 정렬
        const sortedCommits = [...commitsInFeature].sort(
          (a, b) => a.authorDate.getTime() - b.authorDate.getTime(),
        );

        // 1. 총 경과 시간 계산 (첫 커밋 ~ 마지막 커밋)
        const firstCommitDate = sortedCommits[0].authorDate;
        const lastCommitDate =
          sortedCommits[sortedCommits.length - 1].authorDate;
        totalElapsedHours =
          (lastCommitDate.getTime() - firstCommitDate.getTime()) /
          (1000 * 3600);

        // 2. 세션 기반 실제 작업 시간 계산
        // 커밋 간 간격이 SESSION_GAP_HOURS 이상이면 다른 작업 세션으로 간주
        for (let i = 1; i < sortedCommits.length; i++) {
          const prevCommit = sortedCommits[i - 1];
          const currentCommit = sortedCommits[i];

          const gapHours =
            (currentCommit.authorDate.getTime() -
              prevCommit.authorDate.getTime()) /
            (1000 * 3600);

          if (gapHours < SESSION_GAP_HOURS) {
            // 같은 세션 내의 커밋: 실제 작업 시간으로 간주
            timeSpentHours += gapHours;
          } else {
            // 세션이 끊긴 경우: 이전 커밋 후 정리 시간만 추가 (30분)
            timeSpentHours += 0.5;
          }
        }

        // 마지막 커밋 후 정리/테스트 시간 추가 (30분)
        timeSpentHours += 0.5;

        // 실제 작업 시간이 총 경과 시간을 초과할 수 없음
        // (커밋이 1개인 경우 제외: 최소 작업 시간 0.5시간 보장)
        if (commitsInFeature.length > 1) {
          timeSpentHours = Math.min(timeSpentHours, totalElapsedHours);
        }

        timeSpentSeconds = timeSpentHours * 3600;
      }

      return {
        featureName: feature.featureName,
        commits: commitsInFeature.map((c) => ({
          ...c,
          authorDate: c.authorDate.toISOString(),
        })),
        timeSpentSeconds: timeSpentSeconds,
        timeSpentHours: timeSpentHours, // 실제 작업 시간 (세션 기반)
        totalElapsedHours: totalElapsedHours, // 총 경과 시간 (첫 ~ 마지막 커밋)
      };
    });

    // API 응답 형식에 맞게 dbCommits의 authorDate를 string으로 변환
    const formattedDbCommits = dbCommits.map((commit) => ({
      ...commit,
      authorDate: commit.authorDate.toISOString(),
    }));

    return NextResponse.json({
      success: true,
      data: formattedDbCommits, // 전체 커밋 데이터
      groupedFeatures: featuresWithCommits, // 그룹화된 기능 데이터
      count: formattedDbCommits.length,
    });
  } catch (error) {
    console.error('Analysis API 에러:', error);
    return NextResponse.json(
      {
        error: '데이터를 분석하는 데 실패했습니다',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
