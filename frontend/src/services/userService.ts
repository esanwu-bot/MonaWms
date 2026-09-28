import { api } from './api';

/** 全局角色：仅 admin / operator */
export type UserRole = 'admin' | 'operator';

/** 用户状态 */
export type UserStatus = 'active' | 'inactive';

/** 用户列表项（与后端 UserController::index field 对齐） */
export interface UserItem {
  id: number;
  username: string;
  email: string;
  real_name: string;
  phone?: string;
  role: UserRole;
  status: UserStatus;
  last_login_time?: string | null;
  created_at: string;
}

/** 创建用户请求 */
export interface CreateUserRequest {
  username: string;
  email: string;
  password: string;
  real_name: string;
  phone?: string;
  role: UserRole;
}

/** 更新用户请求（不含密码） */
export interface UpdateUserRequest {
  username: string;
  email: string;
  real_name: string;
  phone?: string;
  role: UserRole;
}

/** 修改密码请求 */
export interface ChangePasswordRequest {
  password: string;
  confirm_password: string;
}

/** 修改状态请求 */
export interface ChangeStatusRequest {
  status: UserStatus;
}

/** 列表查询参数 */
export interface UserListParams {
  page?: number;
  limit?: number;
  username?: string;
  email?: string;
  role?: UserRole | '';
  status?: UserStatus | '';
}

/** 用户选项（下拉用） */
export interface UserOption {
  id: number;
  username: string;
  real_name: string;
}

export const userService = {
  /** 用户列表（分页） */
  getUsers: (params: UserListParams = {}) => {
    return api.get('/users', { params });
  },

  /** 用户详情 */
  getUser: (id: number) => {
    return api.get(`/users/${id}`);
  },

  /** 创建用户 */
  createUser: (data: CreateUserRequest) => {
    return api.post('/users', data);
  },

  /** 更新用户 */
  updateUser: (id: number, data: UpdateUserRequest) => {
    return api.put(`/users/${id}`, data);
  },

  /** 删除用户 */
  deleteUser: (id: number) => {
    return api.delete(`/users/${id}`);
  },

  /** 修改用户状态 */
  changeStatus: (id: number, data: ChangeStatusRequest) => {
    return api.put(`/users/${id}/status`, data);
  },

  /** 修改用户密码 */
  changePassword: (id: number, data: ChangePasswordRequest) => {
    return api.put(`/users/${id}/password`, data);
  },

  /** 用户选项列表 */
  getOptions: () => {
    return api.get<UserOption[]>('/users/options');
  },
};
