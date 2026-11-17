# Security Specification & Payload-First TDD

## 1. Data Invariants
1. **Strict Ownership**: Every document under `/users/{userId}`, `/users/{userId}/classes/{classId}`, and `/users/{userId}/tests/{testId}` is strictly private to the authenticated, email-verified teacher whose `request.auth.uid == userId` and `ownerId == request.auth.uid`.
2. **Master Gate**: Creating, updating, or deleting a `Classroom` or `TestRecord` sub-collection document requires the parent `/users/{userId}` workspace document to exist and belong to `request.auth.uid`.
3. **Referential Integrity**: Creating a `TestRecord` requires its `classId` to exist in `/users/{userId}/classes/{classId}` (or be created atomically in a batch via `existsAfter`).
4. **Immutable Ownership & Timestamps**: `ownerId`, `id`, and `createdAt` cannot be modified after creation; `createdAt` must equal `request.time` on create, and `updatedAt` must equal `request.time` on both create and update.
5. **Path & Size Hardening**: All document IDs (`userId`, `classId`, `testId`) must match `^[a-zA-Z0-9_-]+$` and `size() <= 128`. All strings and arrays have explicit upper bounds to prevent resource exhaustion.

## 2. The "Dirty Dozen" Attack Payloads (Must Return PERMISSION_DENIED)
1. **Unauthenticated read/write**: Read `/users/userA` with `request.auth == null`.
2. **Unverified email write**: Write `/users/userA` with `email_verified: false`.
3. **Cross-user access (PII / Marks leak)**: User B reads or lists `/users/userA/classes`.
4. **Identity spoofing on create**: User A creates `/users/userA/classes/c1` with `ownerId: "userB"`.
5. **Shadow / Ghost field injection**: User A creates `/users/userA` with an extra field `{ isAdmin: true }`.
6. **Owner mutation on update**: User A updates `/users/userA/classes/c1` changing `ownerId` to `"userB"`.
7. **Timestamp forgery**: User A creates `/users/userA/tests/t1` with a backdated `createdAt` instead of `request.time`.
8. **Immutable `createdAt` tamper**: User A updates `/users/userA/tests/t1` changing `createdAt`.
9. **Path ID poisoning**: User A writes `/users/userA/classes/bad$id..1` (fails `isValidId`).
10. **Oversized string DoS**: User A writes `/users/userA/classes/c1` with `name` of 500 characters (`> 120`).
11. **Type poisoning on update**: User A updates `passPercentage` in `TestRecord` to `"thirty"` (non-number) or `150` (`> 100`).
12. **Orphaned test creation**: User A creates `/users/userA/tests/t1` referencing a nonexistent `classId: "missing-class"`.
