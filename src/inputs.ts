/**
 * Inputs to the GH Workflow
 */
export interface Inputs {
  /**
   * The GitHub TOKEN to use to create the comment
   */
  githubToken: string;

  /**
   * The method to create a stack diff.
   *
   * Valid values are `change-set` or `template-only`.
   *
   * Use changeset diff for the highest fidelity, including analyze resource replacements.
   * In this method, diff will use the deploy role instead of the lookup role.
   *
   * Use template-only diff for a faster, less accurate diff that doesn't require
   * permissions to create a change-set.
   *
   * @default 'change-set'
   */
  diffMethod: string;

  /**
   * Git reference to compare against for detecting changes
   *
   * @default 'origin/main'
   */
  baseRef: string;

  /**
   * An optional title for each diff comment on the PR.
   *
   * @default - no title
   */
  title?: string;
}
