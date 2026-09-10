export type KFactorInput = {
  activatedUsers: number;
  invitesSent: number;
  uniqueInviters: number;
  inviteClicks: number;
  inviteSignups: number;
  inviteActivated: number;
};

const rate = (numerator: number, denominator: number) => denominator > 0 ? numerator / denominator : 0;

// verifiedInviteはWeb Share APIが成功した共有だけ。リンクコピーや共有画面を開いただけの操作は
// invite intentとして別イベントに残し、K-factorのinvitesSentには含めない。
export function calculateKFactor(input: KFactorInput) {
  const invitesPerActivatedUser = rate(input.invitesSent, input.activatedUsers);
  const inviteActivationRate = rate(input.inviteActivated, input.invitesSent);
  return {
    ...input,
    invitesPerActivatedUser,
    inviteClickRate: rate(input.inviteClicks, input.invitesSent),
    inviteSignupRate: rate(input.inviteSignups, input.inviteClicks),
    inviteActivationRate,
    kFactor: invitesPerActivatedUser * inviteActivationRate,
    sampleIsSmall: input.invitesSent < 20 || input.uniqueInviters < 5,
  };
}
