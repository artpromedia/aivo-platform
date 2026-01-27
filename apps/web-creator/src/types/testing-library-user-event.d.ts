declare module '@testing-library/user-event' {
  interface UserEventInstance {
    click(element: Element): Promise<void>;
    type(element: Element, text: string): Promise<void>;
    keyboard(text: string): Promise<void>;
    clear(element: Element): Promise<void>;
    hover(element: Element): Promise<void>;
    unhover(element: Element): Promise<void>;
    tab(options?: { shift?: boolean }): Promise<void>;
    selectOptions(element: Element, values: string | string[] | Element | Element[]): Promise<void>;
  }

  interface UserEvent {
    setup(options?: Record<string, unknown>): UserEventInstance;
  }

  const userEvent: UserEvent;
  export default userEvent;
}
