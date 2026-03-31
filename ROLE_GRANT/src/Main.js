/****************
 * Main.gs
 *
 * 役割:
 * - 実行トリガー（時間ベース、手動など）に応じてロール付与処理を実行
 * - ロール付与の実行結果をログシートに記録
 *
 * 前提:
 * - ロール付与のルールやマッピングはスプレッドシートの所定のシートに定義されている
 * - Discordのロール付与APIは別途用意されており、スクリプトプロパティでURLとトークンが設定されている
 ****************/

function runSupportEndMonthly() {
  return runRoleJob_("JOB_SUPPORT_END_MONTHLY", "MANUAL");
}

function runSupportEndMonthlyDryRun() {
  return runRoleJob_("JOB_SUPPORT_END_MONTHLY", "MANUAL_DRY_RUN", true);
}

function runRoleJob_(jobCode, triggerType, forceDryRun) {
  const ctx = createExecutionContext_(jobCode, triggerType, forceDryRun);

  try {
    const job = getRoleJobByCode_(ctx.memberSs, jobCode);
    if (!job || job.enabled !== true) {
      throw new Error(`Job not found or disabled: ${jobCode}`);
    }

    const rules = getRoleRulesByGroup_(ctx.memberSs, job.rule_group);
    if (!rules.length) {
      throw new Error(`No enabled rules found. rule_group=${job.rule_group}`);
    }

    const membersSheet = getSheetOrThrow_(ctx.memberSs, "Members");
    const members = getSheetRecords_(membersSheet);

    const roleMappings = getRoleMappings_(ctx.memberSs);
    const actionSets = getRoleActionSets_(ctx.memberSs);
    const masterUpdates = getRoleMasterUpdates_(ctx.memberSs);
    const destinations = getDestinations_(ctx.memberSs);

    const runSummary = {
      run_id: ctx.runId,
      run_at: ctx.runAt,
      trigger_type: triggerType,
      job_name: job.job_name,
      target_month: ctx.targetMonth,
      target_count: 0,
      success_count: 0,
      failed_count: 0,
      skipped_count: 0,
      discord_post_status: "NOT_EXECUTED",
      member_update_status: "NOT_EXECUTED",
      success_notify_status: "NOT_EXECUTED",
      admin_notify_status: "NOT_EXECUTED",
      error: ""
    };

    const detailRows = [];
    const dataIssueRows = [];

    let anyDiscordPostFailed = false;
    let anyMemberUpdateFailed = false;
    let anySuccessNotifyFailed = false;

    rules.forEach(rule => {
      members.forEach(member => {
        const rowNumber = member.__rowNumber;

        // 共通条件
        const commonCheck = checkCommonEligibility_(member);
        if (!commonCheck.ok) {
          runSummary.skipped_count++;
          if (commonCheck.logIssue) {
            dataIssueRows.push(buildDataIssueRow_(ctx, triggerType, member, rowNumber, commonCheck.issue));
          }
          return;
        }

        // ルール条件
        const conditionResult = evaluateRuleConditions_(member, rule, ctx);
        if (!conditionResult.ok) {
          runSummary.skipped_count++;
          return;
        }

        // 必須データ検証
        const validationIssues = validateSupportEndMember_(member, roleMappings);
        if (validationIssues.length > 0) {
          runSummary.skipped_count++;
          validationIssues.forEach(issue => {
            dataIssueRows.push(buildDataIssueRow_(ctx, triggerType, member, rowNumber, issue));
          });
          return;
        }

        runSummary.target_count++;

        try {
          const actionSet = actionSets[rule.action_set_code] || [];
          if (actionSet.length === 0) {
            throw new Error(`Action set not found: ${rule.action_set_code}`);
          }

          const resolvedActions = resolveRoleActions_(member, actionSet, roleMappings);
          const destination = destinations[rule.destination_code] || null;

          let roleApiResult = {
            status: "SKIPPED_DRY_RUN",
            actions: resolvedActions.map(a => ({
              action_order: a.action_order,
              action_type: a.action_type,
              role_kind: a.role_kind,
              business_code: a.business_code,
              discord_role_id: a.discord_role_id,
              result: "SKIPPED_DRY_RUN",
              error_code: "",
              error_message: ""
            })),
            notify_status: "SKIPPED_DRY_RUN"
          };

          if (!ctx.dryRun) {
            roleApiResult = callDiscordRoleApi_({
              runId: ctx.runId,
              jobCode: jobCode,
              ruleCode: rule.rule_code,
              memberKey: member.member_key,
              handleName: member.handle_name,
              discordUserId: member.discord_user_id,
              mentionMemberFlg: destination ? destination.mention_member_flg === true : false,
              destination: destination,
              messageTemplate: rule.message_template,
              messageVariables: {
                current_class_name: member.current_class_name || "",
                handle_name: member.handle_name || ""
              },
              actions: resolvedActions
            });
          }

          let memberUpdateStatus = "SKIPPED_DRY_RUN";
          if (!ctx.dryRun) {
            applyMemberUpdates_(membersSheet, rowNumber, member, masterUpdates[rule.master_update_set_code] || []);
            memberUpdateStatus = "SUCCESS";
          }

          roleApiResult.actions.forEach(actionResult => {
            detailRows.push(buildRoleGrantDetailRow_(
              ctx,
              triggerType,
              job.job_name,
              rule.rule_code,
              member,
              rowNumber,
              actionResult,
              memberUpdateStatus,
              roleApiResult.notify_status,
              "NOT_USED",
              ""
            ));
          });

          runSummary.success_count++;

          if (roleApiResult.status !== "SUCCESS") {
            anyDiscordPostFailed = true;
          }
          if (memberUpdateStatus !== "SUCCESS" && memberUpdateStatus !== "SKIPPED_DRY_RUN") {
            anyMemberUpdateFailed = true;
          }
          if (roleApiResult.notify_status !== "SUCCESS" && roleApiResult.notify_status !== "SKIPPED_DRY_RUN") {
            anySuccessNotifyFailed = true;
          }

        } catch (err) {
          runSummary.failed_count++;

          detailRows.push(buildRoleGrantDetailRow_(
            ctx,
            triggerType,
            job.job_name,
            rule.rule_code,
            member,
            rowNumber,
            {
              action_order: "",
              action_type: "",
              role_kind: "",
              business_code: "",
              discord_role_id: "",
              result: "FAILED",
              error_code: "UNEXPECTED_ERROR",
              error_message: String(err.message || err)
            },
            "FAILED",
            "FAILED",
            "NOT_USED",
            String(err.message || err)
          ));

          if (job.stop_on_error_flg === true) {
            throw err;
          }
        }
      });
    });

    runSummary.discord_post_status = decideSummaryStatus_(runSummary.target_count, runSummary.failed_count, anyDiscordPostFailed, ctx.dryRun);
    runSummary.member_update_status = decideSummaryStatus_(runSummary.target_count, runSummary.failed_count, anyMemberUpdateFailed, ctx.dryRun);
    runSummary.success_notify_status = decideSummaryStatus_(runSummary.target_count, runSummary.failed_count, anySuccessNotifyFailed, ctx.dryRun);
    runSummary.admin_notify_status = "NOT_USED";

    appendLogRuns_(ctx.logSs, [runSummary]);
    if (detailRows.length > 0) appendRoleGrantDetails_(ctx.logSs, detailRows);
    if (dataIssueRows.length > 0) appendDataIssues_(ctx.logSs, dataIssueRows);

    return {
      ok: true,
      run_id: ctx.runId,
      summary: runSummary
    };

  } catch (err) {
    const failedRunSummary = {
      run_id: ctx.runId,
      run_at: ctx.runAt,
      trigger_type: triggerType,
      job_name: jobCode,
      target_month: ctx.targetMonth,
      target_count: 0,
      success_count: 0,
      failed_count: 0,
      skipped_count: 0,
      discord_post_status: "FAILED",
      member_update_status: "FAILED",
      success_notify_status: "FAILED",
      admin_notify_status: "NOT_USED",
      error: String(err.message || err)
    };
    appendLogRuns_(ctx.logSs, [failedRunSummary]);
    throw err;
  }
}