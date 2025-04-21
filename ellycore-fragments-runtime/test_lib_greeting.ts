declare global {
    function getName(): Promise<string>;
}

globalThis.getName = () => {
    return globalThis.__request<string>("getName");
}
